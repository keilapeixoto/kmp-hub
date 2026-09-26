"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateInvoiceTotals } from "@/lib/invoices/data";
import type {
  InvoiceCurrency,
  InvoiceDiscountType,
  InvoicePaymentMethod,
  InvoiceStatus,
} from "@/lib/invoices/types";

export type InvoiceFormState = { error: string | null };

type ParsedItem = { descricao: string; quantidade: number; valor_unitario: number };

function firstString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseItems(raw: FormDataEntryValue | null): ParsedItem[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const items: ParsedItem[] = [];
  for (const row of parsed) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const descricao = typeof r.descricao === "string" ? r.descricao.trim() : "";
    const quantidade = Number(r.quantidade);
    const valorUnitario = Number(r.valor_unitario);
    if (!descricao || !Number.isFinite(quantidade) || !Number.isFinite(valorUnitario)) {
      continue;
    }
    items.push({ descricao, quantidade, valor_unitario: valorUnitario });
  }
  return items;
}

function invoiceFieldsFromForm(formData: FormData) {
  const descontoTipo = (firstString(formData.get("desconto_tipo")) ||
    "none") as InvoiceDiscountType;
  const descontoValor = Number(formData.get("desconto_valor")) || 0;
  const gstIncluido = formData.get("gst_incluido") === "on";
  const caseId = firstString(formData.get("case_id"));
  const dataVencimento = firstString(formData.get("data_vencimento"));

  return {
    client_id: firstString(formData.get("client_id")),
    case_id: caseId || null,
    moeda: (firstString(formData.get("moeda")) || "AUD") as InvoiceCurrency,
    data_emissao:
      firstString(formData.get("data_emissao")) ||
      new Date().toISOString().slice(0, 10),
    data_vencimento: dataVencimento || null,
    servico_referente: firstString(formData.get("servico_referente")) || null,
    desconto_tipo: descontoTipo,
    desconto_valor: descontoValor,
    gst_incluido: gstIncluido,
    forma_pagamento: (firstString(formData.get("forma_pagamento")) ||
      "payid") as InvoicePaymentMethod,
    payid_valor: firstString(formData.get("payid_valor")) || null,
    payid_bsb: firstString(formData.get("payid_bsb")) || null,
    payid_conta: firstString(formData.get("payid_conta")) || null,
    payid_titular: firstString(formData.get("payid_titular")) || null,
    pix_chave: firstString(formData.get("pix_chave")) || null,
    pix_titular: firstString(formData.get("pix_titular")) || null,
    observacoes: firstString(formData.get("observacoes")) || null,
  };
}

export async function createInvoice(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const fields = invoiceFieldsFromForm(formData);
  if (!fields.client_id) return { error: "Selecione um cliente." };

  const items = parseItems(formData.get("items_json"));
  if (!items || items.length === 0) {
    return { error: "Adicione ao menos um item com descrição, quantidade e valor." };
  }

  const totals = calculateInvoiceTotals(
    items,
    fields.desconto_tipo,
    fields.desconto_valor,
    fields.gst_incluido,
  );

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      ...fields,
      subtotal: totals.subtotal,
      gst_valor: totals.gstValor,
      total: totals.total,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return {
      error: `Não foi possível criar a invoice: ${error?.message ?? "erro desconhecido"}`,
    };
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item, index) => ({
      invoice_id: invoice.id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      ordem: index,
    })),
  );
  if (itemsError) {
    return { error: `Invoice criada, mas os itens falharam: ${itemsError.message}` };
  }

  revalidatePath("/financeiro");
  redirect(`/financeiro/${invoice.id}`);
}

export async function updateInvoice(
  id: string,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const fields = invoiceFieldsFromForm(formData);
  if (!fields.client_id) return { error: "Selecione um cliente." };

  const items = parseItems(formData.get("items_json"));
  if (!items || items.length === 0) {
    return { error: "Adicione ao menos um item com descrição, quantidade e valor." };
  }

  const totals = calculateInvoiceTotals(
    items,
    fields.desconto_tipo,
    fields.desconto_valor,
    fields.gst_incluido,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      ...fields,
      subtotal: totals.subtotal,
      gst_valor: totals.gstValor,
      total: totals.total,
    })
    .eq("id", id);
  if (error) {
    return { error: `Não foi possível salvar a invoice: ${error.message}` };
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item, index) => ({
      invoice_id: id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      ordem: index,
    })),
  );
  if (itemsError) {
    return { error: `Invoice salva, mas os itens falharam: ${itemsError.message}` };
  }

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${id}`);
  redirect(`/financeiro/${id}`);
}

export type QuickClientResult =
  | { error: string; client: null }
  | { error: null; client: { id: string; nome: string } };

export async function createQuickClient(
  nome: string,
  email: string,
  telefone: string,
): Promise<QuickClientResult> {
  const nomeTrim = nome.trim();
  if (!nomeTrim) {
    return { error: "Informe o nome do cliente.", client: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      nome: nomeTrim,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
    })
    .select("id, nome")
    .single();

  if (error || !data) {
    return {
      error: `Não foi possível criar o cliente: ${error?.message ?? "erro desconhecido"}`,
      client: null,
    };
  }

  revalidatePath("/clientes");
  return { error: null, client: data };
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient();
  const update: { status: InvoiceStatus; data_pagamento?: string } = { status };
  if (status === "paga") {
    update.data_pagamento = new Date().toISOString().slice(0, 10);
  }
  await supabase.from("invoices").update(update).eq("id", id);
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${id}`);
}
