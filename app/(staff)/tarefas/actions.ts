"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ ...fields, participantes })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${id}`);
  redirect(`/tarefas/${id}`);
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
