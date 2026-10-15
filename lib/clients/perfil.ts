import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Case } from "@/lib/cases/types";
import { percentualPreenchido, STATUS_COM_O_CLIENTE } from "@/lib/portal/progresso";
import { ordenarTarefas } from "./perfil-calc";

// Dados do perfil do cliente (cabeçalho com indicadores, processos em
// cartões, tarefas). Tudo com a sessão de quem está logado — o RLS decide o
// que aparece. Consultas em lote para todos os processos do cliente, não uma
// por processo.

export type ProcessoDoPerfil = {
  caseId: string;
  checklistPct: number | null;
  pendentesCliente: number;
  formularioPct: number | null;
  formularioStatus: string | null;
};

export type TarefaDoPerfil = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  prazo: string | null;
  responsavel: string;
  case_id: string | null;
};

export async function getPerfilDoCliente(
  clientId: string,
  cases: Pick<Case, "id" | "service_type_id">[],
): Promise<{ processos: Record<string, ProcessoDoPerfil>; tarefas: TarefaDoPerfil[] }> {
  const supabase = await createSupabaseClient();
  const caseIds = cases.map((c) => c.id);

  const tarefasQuery = supabase
    .from("tasks")
    .select("id, titulo, status, prioridade, prazo, responsavel, case_id")
    .limit(50);
  const [{ data: tarefas }, { data: checklists }, { data: forms }, { data: tipos }] = await Promise.all([
    caseIds.length > 0
      ? tarefasQuery.or(`client_id.eq.${clientId},case_id.in.(${caseIds.join(",")})`)
      : tarefasQuery.eq("client_id", clientId),
    caseIds.length > 0
      ? supabase.from("checklists").select("id, case_id, percentual").in("case_id", caseIds)
      : Promise.resolve({ data: [] as { id: string; case_id: string; percentual: number }[] }),
    caseIds.length > 0
      ? supabase.from("case_forms").select("id, case_id, template_id, status").in("case_id", caseIds)
      : Promise.resolve({ data: [] as { id: string; case_id: string; template_id: string; status: string }[] }),
    cases.length > 0
      ? supabase
          .from("service_types")
          .select("id, case_form_template_id")
          .in("id", [...new Set(cases.map((c) => c.service_type_id))])
      : Promise.resolve({ data: [] as { id: string; case_form_template_id: string | null }[] }),
  ]);

  // Mesmo critério do card do processo: o formulário do processo é o do tipo de serviço.
  const templatePorTipo = new Map(
    (tipos ?? []).map((t) => [t.id as string, (t.case_form_template_id as string | null) ?? null]),
  );
  const templateIds = [...new Set([...templatePorTipo.values()].filter((t): t is string => Boolean(t)))];
  const formsDoTemplate = (forms ?? []).filter((f) => templateIds.includes(f.template_id as string));

  const [{ data: itens }, { data: passos }, { data: respostas }] = await Promise.all([
    (checklists ?? []).length > 0
      ? supabase
          .from("checklist_items")
          .select("checklist_id, status")
          .in("checklist_id", (checklists ?? []).map((c) => c.id))
          .is("parent_item_id", null)
      : Promise.resolve({ data: [] as { checklist_id: string; status: string }[] }),
    templateIds.length > 0
      ? supabase.from("case_form_steps").select("id, template_id").in("template_id", templateIds)
      : Promise.resolve({ data: [] as { id: string; template_id: string }[] }),
    formsDoTemplate.length > 0
      ? supabase
          .from("case_form_responses")
          .select("case_form_id, field_id, valor")
          .in("case_form_id", formsDoTemplate.map((f) => f.id))
      : Promise.resolve({ data: [] as { case_form_id: string; field_id: string; valor: string | null }[] }),
  ]);

  const { data: campos } =
    (passos ?? []).length > 0
      ? await supabase
          .from("case_form_fields")
          .select("id, step_id")
          .in("step_id", (passos ?? []).map((p) => p.id))
      : { data: [] as { id: string; step_id: string }[] };

  const templateDoPasso = new Map((passos ?? []).map((p) => [p.id as string, p.template_id as string]));
  const camposPorTemplate = new Map<string, string[]>();
  for (const campo of campos ?? []) {
    const t = templateDoPasso.get(campo.step_id as string);
    if (!t) continue;
    camposPorTemplate.set(t, [...(camposPorTemplate.get(t) ?? []), campo.id as string]);
  }

  const processos: Record<string, ProcessoDoPerfil> = {};
  for (const c of cases) {
    const checklist = (checklists ?? []).find((cl) => cl.case_id === c.id);
    const itensDoChecklist = checklist ? (itens ?? []).filter((i) => i.checklist_id === checklist.id) : [];
    const templateId = templatePorTipo.get(c.service_type_id) ?? null;
    const form = templateId
      ? formsDoTemplate.find((f) => f.case_id === c.id && f.template_id === templateId)
      : undefined;
    processos[c.id] = {
      caseId: c.id,
      checklistPct: checklist ? Math.round(Number(checklist.percentual)) : null,
      pendentesCliente: itensDoChecklist.filter((i) => STATUS_COM_O_CLIENTE.includes(i.status as string)).length,
      formularioPct: templateId
        ? percentualPreenchido(
            camposPorTemplate.get(templateId) ?? [],
            form ? (respostas ?? []).filter((r) => r.case_form_id === form.id) : [],
          )
        : null,
      formularioStatus: form ? (form.status as string) : templateId ? "nao_iniciado" : null,
    };
  }

  return { processos, tarefas: ordenarTarefas((tarefas ?? []) as TarefaDoPerfil[]) };
}
