"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";

export type TaskFormState = {
  error: string | null;
};

const TEXT_FIELDS = [
  "titulo",
  "descricao",
  "client_id",
  "case_id",
  "responsavel",
  "prioridade",
  "prazo",
  "status",
  "dependencia_id",
] as const;

function readTaskFields(formData: FormData) {
  const fields: Record<string, string | null> = {};
  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  const participantes = formData
    .getAll("participantes")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

  return { fields, participantes };
}

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { fields, participantes } = readTaskFields(formData);

  if (!fields.titulo) {
    return { error: "Informe o título da tarefa." };
  }

  const insertData: Record<string, unknown> = { participantes };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) insertData[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar a tarefa." };
  }

  revalidatePath("/tarefas");
  redirect(`/tarefas/${data.id}`);
}

export async function updateTask(
  id: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { fields, participantes } = readTaskFields(formData);

  if (!fields.titulo) {
    return { error: "Informe o título da tarefa." };
  }

  // "Eu mesmo(a)" chega vazio; na edição isso apagava o responsável (coluna
  // obrigatória) e o banco recusava a gravação inteira. Vazio = manter.
  const { responsavel, ...resto } = fields;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ ...resto, ...(responsavel ? { responsavel } : {}), participantes })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
  redirect(`/tarefas/${id}`);
}

/**
 * Edição rápida direto na lista de tarefas (status, prioridade, prazo). Só
 * esses três campos e só valores válidos; o RLS de tasks decide se a pessoa
 * pode mexer naquela tarefa.
 */
export async function updateTaskField(
  id: string,
  campo: "status" | "prioridade" | "prazo",
  valor: string,
): Promise<{ error: string | null }> {
  const validos: Record<string, readonly string[]> = {
    status: TASK_STATUSES.map((s) => s.slug),
    prioridade: TASK_PRIORITIES.map((p) => p.slug),
  };
  const novo: string | null = valor.trim() || null;
  if (campo === "prazo") {
    if (novo && !/^\d{4}-\d{2}-\d{2}$/.test(novo)) return { error: "Data inválida." };
  } else if (!novo || !validos[campo].includes(novo)) {
    return { error: "Valor inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ [campo]: novo })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[updateTaskField]", error.code, error.message);
    return { error: "Não foi possível salvar." };
  }
  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
  return { error: null };
}

export async function updateTaskStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
}

export async function addTaskComment(taskId: string, formData: FormData) {
  const texto = formData.get("texto");
  if (typeof texto !== "string" || !texto.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("task_comments")
    .insert({ task_id: taskId, texto: texto.trim() });

  revalidatePath(`/tarefas/${taskId}`);
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/tarefas");
  redirect("/tarefas");
}
