"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { camposParaAtualizar } from "@/lib/clients/update-fields";
import { efeitosDaEtapa, mais28Dias } from "@/lib/cases/efeitos-da-etapa";
import { dayKeySydney } from "@/lib/appointments/timezones";

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
  const { error } = await supabase.from("cases").update({ etapa_id: etapaId }).eq("id", id);
  if (!error) await aplicarEfeitosDaEtapa(id, etapaId);
  revalidatePath("/processos");
  revalidatePath("/clientes/[id]", "page");
  revalidatePath("/portal", "layout"); // o cliente vê a fase nova no portal
}

/**
 * Ao entrar numa etapa: atualiza o "Andamento da aplicação" e abre o prazo de
 * 28 dias quando a etapa pede (exame médico, pedido da imigração) — regras em
 * lib/cases/efeitos-da-etapa.ts. Não abre prazo repetido do mesmo tipo.
 */
async function aplicarEfeitosDaEtapa(caseId: string, etapaId: string) {
  const supabase = await createClient();
  const { data: etapa } = await supabase.from("case_stages").select("nome").eq("id", etapaId).maybeSingle();
  if (!etapa) return;
  const efeitos = efeitosDaEtapa(etapa.nome as string);
  const hoje = dayKeySydney(new Date().toISOString());

  const mudar: Record<string, string> = {};
  if (efeitos.aplicacao) {
    mudar.aplicacao_status = efeitos.aplicacao;
    if (efeitos.aplicacao === "concedida") mudar.aplicacao_decidida_em = hoje;
  }
  if (efeitos.skills) mudar.skills_status = efeitos.skills;
  if (Object.keys(mudar).length) {
    const { error } = await supabase.from("cases").update(mudar).eq("id", caseId);
    if (error) console.error("[aplicarEfeitosDaEtapa] andamento:", error.code, error.message);
    if (efeitos.aplicacao === "em_analise") {
      // Data de envio só na primeira vez.
      await supabase.from("cases").update({ aplicacao_enviada_em: hoje }).eq("id", caseId).is("aplicacao_enviada_em", null);
    }
  }

  if (efeitos.prazo) {
    const { data: aberto } = await supabase
      .from("case_deadlines")
      .select("id")
      .eq("case_id", caseId)
      .eq("tipo_pedido", efeitos.prazo)
      .in("status", ["aguardando_documento", "extensao_solicitada"])
      .limit(1)
      .maybeSingle();
    if (!aberto) {
      const { error } = await supabase.from("case_deadlines").insert({
        case_id: caseId,
        tipo_pedido: efeitos.prazo,
        data_pedido: hoje,
        prazo_final: mais28Dias(hoje),
        notas: `Aberto ao entrar na etapa "${etapa.nome}". Ajuste a data se o pedido da imigração for de outro dia.`,
      });
      if (error) console.error("[aplicarEfeitosDaEtapa] prazo:", error.code, error.message);
    }
    revalidatePath("/vencimentos/prazos");
  }
  revalidatePath(`/processos/${caseId}`);
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

// ---------------------------------------------------------------------------
// Andamento da aplicação no Department e do skills assessment
// (migração 20261016170000_application_status.sql). O RLS de cases decide
// quem pode mudar (quem edita o processo).
// ---------------------------------------------------------------------------

const APLICACAO_VALIDOS = ["nao_enviada", "enviada", "em_analise", "pedido_informacao", "concedida", "recusada", "retirada"];
const SKILLS_VALIDOS = ["nao_se_aplica", "a_aplicar", "aplicado", "aprovado", "negado"];
const DECIDIDA = ["concedida", "recusada", "retirada"];

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Troca rápida no quadro de Aplicações: preenche as datas que faltarem. */
export async function mudarStatusDaAplicacao(caseId: string, status: string): Promise<{ error: string | null }> {
  if (!APLICACAO_VALIDOS.includes(status)) return { error: "Status inválido." };
  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("cases")
    .select("aplicacao_enviada_em, aplicacao_decidida_em")
    .eq("id", caseId)
    .maybeSingle();
  if (!atual) return { error: "Processo não encontrado." };
  const enviadaOuDepois = status !== "nao_enviada";
  const { data, error } = await supabase
    .from("cases")
    .update({
      aplicacao_status: status,
      ...(enviadaOuDepois && !atual.aplicacao_enviada_em ? { aplicacao_enviada_em: hojeIso() } : {}),
      ...(DECIDIDA.includes(status) && !atual.aplicacao_decidida_em ? { aplicacao_decidida_em: hojeIso() } : {}),
    })
    .eq("id", caseId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[mudarStatusDaAplicacao]", error.code, error.message);
    return { error: "Não foi possível salvar." };
  }
  revalidatePath("/vencimentos/aplicacoes");
  revalidatePath(`/processos/${caseId}`);
  return { error: null };
}

export type AndamentoState = { error: string | null; ok: boolean };

/** Formulário completo do card "Andamento da aplicação" no processo. */
export async function salvarAndamento(caseId: string, _prev: AndamentoState, formData: FormData): Promise<AndamentoState> {
  const texto = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const aplicacao = texto("aplicacao_status") ?? "nao_enviada";
  const skills = texto("skills_status") ?? "nao_se_aplica";
  if (!APLICACAO_VALIDOS.includes(aplicacao) || !SKILLS_VALIDOS.includes(skills)) {
    return { error: "Valor inválido.", ok: false };
  }
  const data = (k: string) => {
    const v = texto(k);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const supabase = await createClient();
  const { data: linhas, error } = await supabase
    .from("cases")
    .update({
      aplicacao_status: aplicacao,
      aplicacao_enviada_em: data("aplicacao_enviada_em"),
      aplicacao_decidida_em: data("aplicacao_decidida_em"),
      skills_status: skills,
      skills_orgao: texto("skills_orgao"),
      skills_aplicado_em: data("skills_aplicado_em"),
    })
    .eq("id", caseId)
    .select("id");
  if (error || !linhas?.length) {
    if (error) console.error("[salvarAndamento]", error.code, error.message);
    return {
      error:
        error?.code === "PGRST204" || error?.code === "42703"
          ? "O andamento ainda não foi ativado no banco (migração 20261016170000)."
          : "Não foi possível salvar.",
      ok: false,
    };
  }
  revalidatePath(`/processos/${caseId}`);
  revalidatePath("/vencimentos/aplicacoes");
  return { error: null, ok: true };
}
