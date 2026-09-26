import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { GST_RATE } from "./constants";
import type {
  Invoice,
  InvoiceCurrency,
  InvoiceFilters,
  InvoiceItem,
  InvoiceWithClient,
  InvoiceWithItems,
} from "./types";

export async function getInvoices(
  filters: InvoiceFilters = {},
): Promise<InvoiceWithClient[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("invoices")
    .select("*, clients(nome)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  const invoices = ((data ?? []) as Array<Invoice & { clients: { nome: string } | null }>).map(
    ({ clients, ...invoice }) => ({
      ...invoice,
      client_nome: clients?.nome ?? "—",
    }),
  );

  const termo = filters.q?.trim().toLowerCase();
  if (!termo) return invoices;
  return invoices.filter(
    (inv) =>
      inv.numero.toLowerCase().includes(termo) ||
      inv.client_nome.toLowerCase().includes(termo),
  );
}

export async function getInvoice(id: string): Promise<InvoiceWithItems | null> {
  const supabase = await createSupabaseClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return null;

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("ordem");

  return { ...(invoice as Invoice), items: (items ?? []) as InvoiceItem[] };
}

export type InvoiceSummaryRow = { moeda: InvoiceCurrency; recebidoMes: number; pendente: number };

// Recebido no mês = invoices pagas com data_pagamento no mês corrente.
// Pendente a receber = enviada + vencida (rascunho ainda não foi cobrado,
// cancelada não conta, paga já foi recebida). Somado por moeda — AUD e BRL
// não podem ser misturados num único total.
export async function getInvoiceSummary(): Promise<InvoiceSummaryRow[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("moeda, status, total, data_pagamento");
  if (error) throw error;

  const anoMes = new Date().toISOString().slice(0, 7);
  const porMoeda = new Map<InvoiceCurrency, InvoiceSummaryRow>([
    ["AUD", { moeda: "AUD", recebidoMes: 0, pendente: 0 }],
  ]);

  for (const inv of (data ?? []) as Array<{
    moeda: InvoiceCurrency;
    status: string;
    total: number;
    data_pagamento: string | null;
  }>) {
    if (!porMoeda.has(inv.moeda)) {
      porMoeda.set(inv.moeda, { moeda: inv.moeda, recebidoMes: 0, pendente: 0 });
    }
    const linha = porMoeda.get(inv.moeda)!;
    if (inv.status === "paga" && inv.data_pagamento?.startsWith(anoMes)) {
      linha.recebidoMes += inv.total;
    }
    if (inv.status === "enviada" || inv.status === "vencida") {
      linha.pendente += inv.total;
    }
  }

  return Array.from(porMoeda.values());
}

export type InvoiceTotals = { subtotal: number; gstValor: number; total: number };

export function calculateInvoiceTotals(
  items: Array<{ quantidade: number; valor_unitario: number }>,
  descontoTipo: "none" | "value" | "percent",
  descontoValor: number,
  gstIncluido: boolean,
): InvoiceTotals {
  const bruto = items.reduce((acc, item) => acc + item.quantidade * item.valor_unitario, 0);
  const desconto =
    descontoTipo === "value"
      ? descontoValor
      : descontoTipo === "percent"
        ? bruto * (descontoValor / 100)
        : 0;
  const subtotal = Math.max(round2(bruto - desconto), 0);
  const gstValor = gstIncluido ? round2(subtotal * GST_RATE) : 0;
  return { subtotal, gstValor, total: round2(subtotal + gstValor) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
