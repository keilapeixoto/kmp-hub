"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CaseFormState = {
  error: string | null;
};

const TEXT_FIELDS = [
  "client_id",
  "service_type_id",
  "consultor_id",
  "inicio",
  "prazo",
  "status",
  "etapa_id",
  "prioridade",
  "riscos",
  "proxima_acao",
] as const;

function readCaseFields(formData: FormData) {
  const fields: Record<string, string | null> = {};

  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  const equipe = formData
    .getAll("equipe")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

  return { fields, equipe };
}

export async function createCase(
  _prevState: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const { fields, equipe } = readCaseFields(formData);

  if (!fields.client_id || !fields.service_type_id) {
    return { error: "Selecione o cliente e o tipo de serviço." };
  }

  const insertData: Record<string, unknown> = { equipe };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) insertData[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        "Não foi possível cadastrar o processo. Confira os campos e tente de novo.",
    };
  }

  revalidatePath("/processos");
  redirect(`/processos/${data.id}`);
}

export async function updateCase(
  id: string,
  _prevState: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const { fields, equipe } = readCaseFields(formData);

  if (!fields.client_id || !fields.service_type_id) {
    return { error: "Selecione o cliente e o tipo de serviço." };
  }

  const updateData: Record<string, unknown> = { ...fields, equipe };

  const supabase = await createClient();
  const { error } = await supabase.from("cases").update(updateData).eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/processos");
  revalidatePath(`/processos/${id}`);
  redirect(`/processos/${id}`);
}

export async function updateCaseEtapa(id: string, etapaId: string) {
  const supabase = await createClient();
  await supabase.from("cases").update({ etapa_id: etapaId }).eq("id", id);
  revalidatePath("/processos");
}

export async function updateCaseStatusDrag(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("cases").update({ status }).eq("id", id);
  revalidatePath("/processos");
}

export async function deleteCase(id: string) {
  const supabase = await createClient();
  await supabase.from("cases").delete().eq("id", id);
  revalidatePath("/processos");
  redirect("/processos");
}
