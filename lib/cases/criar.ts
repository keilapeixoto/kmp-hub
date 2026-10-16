import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cria um processo na primeira etapa do visto, com o checklist do modelo e os
 * itens obrigatórios já pedidos ao cliente ("solicitado", que aparecem em
 * "Pedidos para você" no portal). Usa o cliente Supabase de quem pede (RLS).
 * Devolve o id do processo e o que não deu certo.
 */
export async function criarProcessoComChecklist(
  supabase: SupabaseClient,
  { clientId, serviceTypeId, consultorId }: { clientId: string; serviceTypeId: string; consultorId: string },
): Promise<{ caseId: string | null; falhou: ("processo" | "checklist")[] }> {
  const [{ data: tipo }, { data: etapas }] = await Promise.all([
    supabase.from("service_types").select("checklist_template_id").eq("id", serviceTypeId).maybeSingle(),
    supabase.from("case_stages").select("id").eq("service_type_id", serviceTypeId).order("ordem").limit(1),
  ]);

  const { data: caso, error } = await supabase
    .from("cases")
    .insert({ client_id: clientId, service_type_id: serviceTypeId, consultor_id: consultorId, etapa_id: etapas?.[0]?.id ?? null })
    .select("id")
    .single();
  if (error || !caso) {
    console.error("[criarProcessoComChecklist] processo:", error?.code, error?.message);
    return { caseId: null, falhou: ["processo"] };
  }
  const caseId = caso.id as string;
  const modelo = (tipo?.checklist_template_id as string | null) ?? null;
  if (!modelo) return { caseId, falhou: [] };

  const { data: checklist, error: erroChecklist } = await supabase
    .from("checklists")
    .insert({ case_id: caseId, checklist_template_id: modelo })
    .select("id")
    .single();
  if (erroChecklist || !checklist) {
    console.error("[criarProcessoComChecklist] checklist:", erroChecklist?.code, erroChecklist?.message);
    return { caseId, falhou: ["checklist"] };
  }
  const { data: obrigatorios } = await supabase
    .from("checklist_template_items")
    .select("id")
    .eq("checklist_template_id", modelo)
    .eq("obrigatorio", true);
  const ids = (obrigatorios ?? []).map((i) => i.id as string);
  if (ids.length) {
    const { error: erroPedido } = await supabase
      .from("checklist_items")
      .update({ status: "solicitado" })
      .eq("checklist_id", checklist.id)
      .in("template_item_id", ids);
    if (erroPedido) console.error("[criarProcessoComChecklist] pedir itens:", erroPedido.code, erroPedido.message);
  }
  return { caseId, falhou: [] };
}
