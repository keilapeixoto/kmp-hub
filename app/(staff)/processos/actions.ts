"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { camposParaAtualizar } from "@/lib/clients/update-fields";

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

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sua sessão expirou. Entre de novo." };
  // consultor_id é obrigatório no banco: "Eu mesmo(a)" chega vazio.
  const updateData: Record<string, unknown> = {
    ...camposParaAtualizar(fields as Record<string, string | null>, {
      usuarioId: auth.user.id,
      consultorNoFormulario: formData.has("consultor_id"),
    }),
    equipe,
  };

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
  revalidatePath("/clientes/[id]", "page");
  revalidatePath("/portal", "layout"); // o cliente vê a fase nova no portal
}

export async function updateCaseStatusDrag(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("cases").update({ status }).eq("id", id);
  revalidatePath("/processos");
}

export async function updateCasePrioridadeInline(id: string, prioridade: string) {
  const supabase = await createClient();
  await supabase.from("cases").update({ prioridade }).eq("id", id);
  revalidatePath("/processos");
}

export async function updateCaseConsultorInline(id: string, consultorId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const consultor = consultorId || auth.user?.id;
  if (!consultor) return;
  await supabase.from("cases").update({ consultor_id: consultor }).eq("id", id);
  revalidatePath("/processos");
}

export async function updateCasePrazoInline(id: string, prazo: string) {
  const supabase = await createClient();
  await supabase
    .from("cases")
    .update({ prazo: prazo || null })
    .eq("id", id);
  revalidatePath("/processos");
}

export async function deleteCase(id: string) {
  const supabase = await createClient();
  await supabase.from("cases").delete().eq("id", id);
  revalidatePath("/processos");
  redirect("/processos");
}

export async function archiveCase(id: string) {
  const supabase = await createClient();
  await supabase.from("cases").update({ status: "arquivado" }).eq("id", id);
  revalidatePath(`/processos/${id}`);
  revalidatePath("/processos");
}

/** Recado da equipe para o cliente, mostrado na linha do tempo do portal. */
export async function addClientUpdate(
  caseId: string,
  mensagem: string,
): Promise<{ error: string | null }> {
  const texto = mensagem.trim();
  if (!texto) return { error: "Escreva o recado." };
  if (texto.length > 500) return { error: "Recado muito longo (máximo 500 caracteres)." };

  const supabase = await createClient();
  const { data: caso } = await supabase
    .from("cases")
    .select("etapa_id, case_stages!cases_etapa_id_fkey(nome)")
    .eq("id", caseId)
    .maybeSingle();
  const etapaNome =
    (caso as unknown as { case_stages?: { nome: string } | null } | null)?.case_stages?.nome ?? null;

  const { error } = await supabase
    .from("case_client_updates")
    .insert({ case_id: caseId, mensagem: texto, etapa_nome: etapaNome });
  if (error) {
    console.error("[addClientUpdate] falhou:", error.code, error.message);
    return {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "A tabela de recados ainda não foi criada no banco (migração 20261015120000)."
          : "Não foi possível salvar o recado.",
    };
  }
  revalidatePath("/clientes/[id]", "page");
  revalidatePath("/portal", "layout");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Tarefas da etapa no processo (pipeline por tarefas)
// ---------------------------------------------------------------------------

/** Cria as tarefas padrão da etapa atual (processos que já estavam na etapa). */
export async function gerarTarefasDaEtapa(caseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gerar_tarefas_da_etapa", { p_case_id: caseId });
  if (error) console.error("[gerarTarefasDaEtapa]", error.code, error.message);
  revalidatePath(`/processos/${caseId}`);
  revalidatePath("/processos");
}

/**
 * Marca/desmarca uma tarefa da etapa. Ao concluir a última, o banco passa o
 * processo para a próxima etapa sozinho (trigger avancar_etapa_quando_concluir).
 */
export async function marcarTarefaDaEtapa(caseId: string, taskId: string, concluida: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: concluida ? "concluida" : "pendente" })
    .eq("id", taskId)
    .eq("case_id", caseId);
  if (error) console.error("[marcarTarefaDaEtapa]", error.code, error.message);
  revalidatePath(`/processos/${caseId}`);
  revalidatePath("/processos");
  revalidatePath("/tarefas");
  return { error: error ? "Não foi possível salvar." : null };
}
