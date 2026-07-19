"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LeadFormState = {
  error: string | null;
};

const TEXT_FIELDS = [
  "nome",
  "telefone",
  "email",
  "rede_social",
  "pais",
  "cidade",
  "origem",
  "servico_interesse",
  "consultor_id",
  "status",
  "proxima_acao",
  "proxima_acao_data",
  "observacoes",
] as const;

function readLeadFields(formData: FormData) {
  const fields: Record<string, string | null> = {};

  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  return fields;
}

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const fields = readLeadFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do lead." };
  }

  const insertData: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) insertData[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        "Não foi possível cadastrar o lead. Confira os campos e tente de novo.",
    };
  }

  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(
  id: string,
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const fields = readLeadFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do lead." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(fields).eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/leads");
}

export async function registerContact(id: string, formData: FormData) {
  const descricao = formData.get("descricao");
  const supabase = await createClient();

  await supabase
    .from("leads")
    .update({ ultimo_contato: new Date().toISOString() })
    .eq("id", id);

  await supabase.from("lead_events").insert({
    lead_id: id,
    tipo: "contato",
    descricao:
      typeof descricao === "string" && descricao.trim()
        ? descricao.trim()
        : "Contato registrado",
  });

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidatePath("/leads");
  redirect("/leads");
}

export type ConvertLeadState = {
  error: string | null;
};

export async function convertLead(
  leadId: string,
  _prevState: ConvertLeadState,
  _formData: FormData,
): Promise<ConvertLeadState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_lead_to_client", {
    p_lead_id: leadId,
  });

  if (error || !data) {
    return {
      error: error?.message ?? "Não foi possível converter este lead.",
    };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/clientes/${data}`);
}
