import { createClient as createSupabaseClient } from "@/lib/supabase/server";

// Pipeline por tarefas (migração 20261016150000_stage_tasks.sql): tarefas
// padrão de cada etapa e as tarefas que elas geram em cada processo. Tudo com
// a sessão de quem está logado. Antes de a migração ser aplicada, as funções
// devolvem vazio em vez de quebrar a página.

export type StageTask = {
  id: string;
  stage_id: string;
  ordem: number;
  titulo: string;
  prazo_dias: number | null;
};

export type TarefaDaEtapa = {
  id: string;
  titulo: string;
  status: string;
  prazo: string | null;
  responsavel: string;
};

/** Tarefas padrão das etapas informadas, agrupadas por etapa. */
export async function getStageTasks(stageIds: string[]): Promise<Record<string, StageTask[]>> {
  if (stageIds.length === 0) return {};
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("case_stage_tasks")
    .select("id, stage_id, ordem, titulo, prazo_dias")
    .in("stage_id", stageIds)
    .order("ordem")
    .order("created_at");
  if (error) return {};
  const porEtapa: Record<string, StageTask[]> = {};
  for (const t of (data ?? []) as StageTask[]) {
    (porEtapa[t.stage_id] ??= []).push(t);
  }
  return porEtapa;
}

/** Tarefas geradas pela etapa atual do processo (só as que vieram das tarefas padrão). */
export async function getTarefasDaEtapa(caseId: string, etapaId: string | null): Promise<TarefaDaEtapa[]> {
  if (!etapaId) return [];
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, titulo, status, prazo, responsavel")
    .eq("case_id", caseId)
    .eq("etapa_id", etapaId)
    .not("stage_task_id", "is", null)
    .order("created_at");
  if (error) return [];
  return (data ?? []) as TarefaDaEtapa[];
}

const ENCERRADAS = ["concluida", "cancelada"];

/** Progresso das tarefas da etapa atual de cada processo: { feitas, total }. */
export async function getProgressoDasEtapas(
  cases: { id: string; etapa_id: string | null }[],
): Promise<Record<string, { feitas: number; total: number }>> {
  const comEtapa = cases.filter((c) => c.etapa_id);
  if (comEtapa.length === 0) return {};
  const supabase = await createSupabaseClient();
  const etapaDo = new Map(comEtapa.map((c) => [c.id, c.etapa_id]));
  const progresso: Record<string, { feitas: number; total: number }> = {};
  // Em blocos, para a lista de ids não estourar o tamanho da URL.
  const ids = comEtapa.map((c) => c.id);
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from("tasks")
      .select("case_id, etapa_id, status")
      .in("case_id", ids.slice(i, i + 150))
      .not("stage_task_id", "is", null);
    if (error) return {};
    for (const t of data ?? []) {
      if (etapaDo.get(t.case_id as string) !== t.etapa_id) continue;
      const p = (progresso[t.case_id as string] ??= { feitas: 0, total: 0 });
      p.total += 1;
      if (ENCERRADAS.includes(t.status as string)) p.feitas += 1;
    }
  }
  return progresso;
}
