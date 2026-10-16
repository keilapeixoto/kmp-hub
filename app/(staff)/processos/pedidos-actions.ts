"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { avisarCliente } from "@/lib/portal/avisos-cliente-server";

// Pedidos ao cliente. Um pedido é um item de checklist com status
// 'solicitado' (aparece em "Pedidos para você" no portal, com envio por
// item); recusa é 'rejeitado' com motivo; formulário reaberto volta para
// 'em_preenchimento' com um recado no portal. Tudo com a sessão de quem pede
// (RLS do processo). O e-mail ao cliente é opcional e nunca impede a gravação.

export type PedidoState = { erro: string | null; ok: string | null };

const texto = (formData: FormData, k: string) => {
  const v = formData.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

function atualizar(caseId: string) {
  revalidatePath(`/processos/${caseId}`);
  revalidatePath("/portal", "layout");
}

/** Checklist do processo; cria um (do modelo do visto, ou vazio) se não houver. */
async function checklistDoProcesso(caseId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: existente } = await supabase.from("checklists").select("id").eq("case_id", caseId).limit(1).maybeSingle();
  if (existente) return existente.id as string;
  const { data: caso } = await supabase
    .from("cases")
    .select("service_types(checklist_template_id)")
    .eq("id", caseId)
    .maybeSingle();
  const modelo =
    (caso as unknown as { service_types?: { checklist_template_id: string | null } | null } | null)?.service_types
      ?.checklist_template_id ?? null;
  const { data, error } = await supabase
    .from("checklists")
    .insert({ case_id: caseId, checklist_template_id: modelo })
    .select("id")
    .single();
  if (error) console.error("[checklistDoProcesso]", error.code, error.message);
  return (data?.id as string | undefined) ?? null;
}

export async function pedirAoCliente(caseId: string, _prev: PedidoState, formData: FormData): Promise<PedidoState> {
  const tipo = texto(formData, "tipo") === "traducao" ? "traducao" : "documento";
  const documento = texto(formData, "documento");
  const instrucoes = texto(formData, "instrucoes");
  const prazo = texto(formData, "prazo");
  const avisar = formData.get("avisar") === "on";

  if (!documento) return { erro: tipo === "traducao" ? "Diga qual documento precisa de tradução." : "Diga qual documento você precisa.", ok: null };
  if (documento.length > 200) return { erro: "Nome do documento muito longo.", ok: null };
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { erro: "Prazo inválido.", ok: null };

  const checklistId = await checklistDoProcesso(caseId);
  if (!checklistId) return { erro: "Não foi possível abrir o checklist do processo.", ok: null };

  const nome = tipo === "traducao" ? `Tradução juramentada: ${documento}` : documento;
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").insert({
    checklist_id: checklistId,
    nome,
    status: "solicitado",
    observacao_equipe: instrucoes,
    prazo,
  });
  if (error) {
    console.error("[pedirAoCliente]", error.code, error.message);
    return {
      erro:
        error.code === "23502"
          ? "Falta aplicar a migração 20261017120000 no Supabase (checklist sem modelo)."
          : "Não foi possível registrar o pedido.",
      ok: null,
    };
  }

  const enviado = avisar
    ? await avisarCliente(caseId, { tipo: "pedido", itens: [{ nome, instrucoes, prazo }] }, "documentos")
    : false;
  atualizar(caseId);
  return {
    erro: null,
    ok: avisar
      ? enviado
        ? "Pedido registrado e cliente avisado por e-mail."
        : "Pedido registrado. O e-mail ao cliente não saiu (sem e-mail cadastrado ou falha no envio); ele vê no portal."
      : "Pedido registrado. O cliente vê no portal.",
  };
}

export async function aprovarItem(caseId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({ status: "aprovado", motivo_rejeicao: null })
    .eq("id", itemId);
  if (error) console.error("[aprovarItem]", error.code, error.message);
  atualizar(caseId);
}

export async function reprovarItem(caseId: string, itemId: string, formData: FormData) {
  const motivo = texto(formData, "motivo");
  if (!motivo) return;
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("checklist_items")
    .update({ status: "rejeitado", motivo_rejeicao: motivo.slice(0, 500) })
    .eq("id", itemId)
    .select("nome")
    .maybeSingle();
  if (error || !item) {
    console.error("[reprovarItem]", error?.code, error?.message);
    return;
  }
  if (formData.get("avisar") === "on") {
    await avisarCliente(caseId, { tipo: "recusa", documento: item.nome as string, motivo }, "documentos");
  }
  atualizar(caseId);
}

export async function reabrirFormulario(caseId: string, caseFormId: string, formData: FormData) {
  const motivo = texto(formData, "motivo");
  if (!motivo) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("case_forms")
    .update({ status: "em_preenchimento", enviado_em: null })
    .eq("id", caseFormId)
    .eq("case_id", caseId);
  if (error) {
    console.error("[reabrirFormulario]", error.code, error.message);
    return;
  }
  // O motivo também fica em destaque no portal e na linha do tempo.
  const { error: erroRecado } = await supabase
    .from("case_client_updates")
    .insert({ case_id: caseId, mensagem: `Atualize seu formulário: ${motivo}`.slice(0, 500) });
  if (erroRecado) console.error("[reabrirFormulario] recado:", erroRecado.code, erroRecado.message);
  if (formData.get("avisar") === "on") {
    await avisarCliente(caseId, { tipo: "formulario", motivo }, "formulario");
  }
  atualizar(caseId);
}
