import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { OPEN_TASK_STATUSES } from "./constants";
import type { Task, TaskComment, TaskFilters } from "./types";

export async function getTasks(filters: TaskFilters): Promise<Task[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.prioridade) query = query.eq("prioridade", filters.prioridade);
  if (filters.responsavel) query = query.eq("responsavel", filters.responsavel);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Task | null;
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as TaskComment[];
}

/** Tarefas abertas por responsável — visão de carga da equipe (seção 6, item 10). */
export async function getWorkload(): Promise<Map<string, number>> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("tasks")
    .select("responsavel")
    .in("status", OPEN_TASK_STATUSES);

  const workload = new Map<string, number>();
  for (const row of data ?? []) {
    workload.set(row.responsavel, (workload.get(row.responsavel) ?? 0) + 1);
  }
  return workload;
}
