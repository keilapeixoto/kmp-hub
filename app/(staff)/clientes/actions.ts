"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ClientFormState = {
  error: string | null;
};

const TEXT_FIELDS = [
  "nome",
  "data_nascimento",
  "nacionalidade",
  "telefone",
  "email",
  "rede_social",
  "pais",
  "cidade",
  "fuso_horario",
  "idioma_preferencial",
  "situacao",
  "objetivos",
  "consultor_id",
] as const;

function readClientFields(formData: FormData) {
  const fields: Record<string, string | null> = {};

  for (const key of TEXT_FIELDS) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  }

  return fields;
}

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do cliente." };
  }

  const insertData: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) insertData[key] = value;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        "Não foi possível cadastrar o cliente. Confira os campos e tente de novo.",
    };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClientRecord(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const fields = readClientFields(formData);

  if (!fields.nome) {
    return { error: "Informe o nome do cliente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(fields).eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function addDependent(clientId: string, formData: FormData) {
  const nome = formData.get("nome");
  const tipo = formData.get("tipo");

  if (typeof nome !== "string" || !nome.trim()) return;
  if (typeof tipo !== "string" || !tipo.trim()) return;

  const supabase = await createClient();
  await supabase.rpc("add_client_dependent", {
    p_client_id: clientId,
    p_nome: nome.trim(),
    p_tipo: tipo,
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function removeDependent(clientId: string, relationId: string) {
  const supabase = await createClient();
  await supabase.from("client_relations").delete().eq("id", relationId);
  revalidatePath(`/clientes/${clientId}`);
}

export async function addIdentityDocument(clientId: string, formData: FormData) {
  const tipo = formData.get("tipo");
  const numero = formData.get("numero");
  const validade = formData.get("validade");

  if (typeof tipo !== "string" || !tipo.trim()) return;

  const supabase = await createClient();
  await supabase.from("identity_documents").insert({
    client_id: clientId,
    tipo: tipo.trim(),
    numero: typeof numero === "string" && numero.trim() ? numero.trim() : null,
    validade:
      typeof validade === "string" && validade.trim() ? validade.trim() : null,
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function archiveIdentityDocument(
  clientId: string,
  documentId: string,
) {
  const supabase = await createClient();
  await supabase
    .from("identity_documents")
    .update({ arquivado: true })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}

export async function archiveClientFile(clientId: string, documentId: string) {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ arquivado: true })
    .eq("id", documentId);

  revalidatePath(`/clientes/${clientId}`);
}
