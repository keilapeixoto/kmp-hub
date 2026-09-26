import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { GST_RATE } from "./constants";
import type {
  Invoice,
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

  const termo = filters.q?.trim().replace(/[,()%]/g, "");
  if (termo) query = query.ilike("numero", `%${termo}%`);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Array<Invoice & { clients: { nome: string } | null }>).map(
    ({ clients, ...invoice }) => ({
      ...invoice,
      client_nome: clients?.nome ?? "—",
    }),
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
