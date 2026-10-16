"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { proximaOrdem, trocaDeOrdem } from "@/lib/cases/etapas";

// Editar as etapas (colunas) da pipeline de um tipo de serviço, direto da
// pipeline. As permissões são as do banco: só admin altera case_stages (RLS).

// O mesmo editor aparece na Pipeline e em Configurações → Tipos de serviço;
// o campo escondido "origem" diz para onde voltar.
type Origem = "config" | "pipeline";
function origemDe(formData?: FormData): Origem {
  return formData?.get("origem") === "config" ? "config" : "pipeline";
}

function voltar(origem: Origem, serviceTypeId: string, erro?: string): never {
  revalidatePath("/processos");
  revalidatePath(`/configuracoes/servicos/${serviceTypeId}`);
  if (origem === "config") {
    const qs = new URLSearchParams(erro ? { etapaErro: erro } : { etapaOk: "1" });
    redirect(`/configuracoes/servicos/${serviceTypeId}?${qs.toString()}`);
  }
  const qs = new URLSearchParams({ view: "kanban", servicoTipo: serviceTypeId, editar: "1" });
  if (erro) qs.set("etapaErro", erro);
  redirect(`/processos?${qs.toString()}`);
}

async function etapasDo(serviceTypeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_stages")
    .select("id, ordem")
    .eq("service_type_id", serviceTypeId);
  return { supabase, etapas: (data ?? []) as { id: string; ordem: number }[] };
}

export async function addStage(serviceTypeId: string, formData: FormData) {
  const o = origemDe(formData);
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) voltar(o, serviceTypeId, "Escreva o nome da etapa.");
  const { supabase, etapas } = await etapasDo(serviceTypeId);
  const { error } = await supabase
    .from("case_stages")
    .insert({ service_type_id: serviceTypeId, nome, ordem: proximaOrdem(etapas) });
  voltar(o, serviceTypeId, error ? "Não foi possível criar a etapa (só admin pode editar)." : undefined);
}

export async function renameStage(serviceTypeId: string, stageId: string, formData: FormData) {
  const o = origemDe(formData);
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) voltar(o, serviceTypeId, "O nome da etapa não pode ficar vazio.");
  const supabase = await createClient();
  const { error } = await supabase.from("case_stages").update({ nome }).eq("id", stageId);
  voltar(o, serviceTypeId, error ? "Não foi possível renomear (só admin pode editar)." : undefined);
}

export async function moveStage(serviceTypeId: string, stageId: string, direcao: "subir" | "descer", formData?: FormData) {
  const o = origemDe(formData);
  const { supabase, etapas } = await etapasDo(serviceTypeId);
  const troca = trocaDeOrdem(etapas, stageId, direcao);
  if (!troca) voltar(o, serviceTypeId);
  // (service_type_id, ordem) é único: passa por uma ordem temporária livre.
  const temporaria = -1 - Math.max(0, ...etapas.map((e) => e.ordem));
  const [a, b] = troca;
  const passos = [
    { id: a.id, ordem: temporaria },
    { id: b.id, ordem: b.ordem },
    { id: a.id, ordem: a.ordem },
  ];
  for (const p of passos) {
    const { error } = await supabase.from("case_stages").update({ ordem: p.ordem }).eq("id", p.id);
    if (error) voltar(o, serviceTypeId, "Não foi possível mudar a ordem (só admin pode editar).");
  }
  voltar(o, serviceTypeId);
}

export async function deleteStage(serviceTypeId: string, stageId: string, formData?: FormData) {
  const o = origemDe(formData);
  const supabase = await createClient();
  const { count } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("etapa_id", stageId);
  if ((count ?? 0) > 0) {
    voltar(o, serviceTypeId, `Esta etapa tem ${count} processo(s). Mova-os para outra etapa antes de remover.`);
  }
  const { error } = await supabase.from("case_stages").delete().eq("id", stageId);
  voltar(o, serviceTypeId, error ? "Não foi possível remover (só admin pode editar)." : undefined);
}

// ---------------------------------------------------------------------------
// Tarefas padrão de cada etapa (case_stage_tasks). Só admin (RLS). Ao entrar
// numa etapa, o banco cria essas tarefas no processo; concluídas todas, o
// processo avança sozinho para a próxima etapa.
// ---------------------------------------------------------------------------

export async function addStageTask(serviceTypeId: string, stageId: string, formData: FormData) {
  const o = origemDe(formData);
  const titulo = String(formData.get("titulo") ?? "").trim();
  const diasTexto = String(formData.get("prazo_dias") ?? "").trim();
  if (!titulo) voltar(o, serviceTypeId, "Escreva o nome da tarefa.");
  const prazo_dias = diasTexto === "" ? null : Number(diasTexto);
  if (prazo_dias !== null && (!Number.isInteger(prazo_dias) || prazo_dias < 0 || prazo_dias > 365)) {
    voltar(o, serviceTypeId, "O prazo da tarefa é em dias, de 0 a 365.");
  }
  const supabase = await createClient();
  const { data: atuais } = await supabase.from("case_stage_tasks").select("ordem").eq("stage_id", stageId);
  const ordem = Math.max(0, ...(atuais ?? []).map((t) => t.ordem as number)) + 1;
  const { error } = await supabase
    .from("case_stage_tasks")
    .insert({ stage_id: stageId, titulo, prazo_dias, ordem });
  voltar(o, serviceTypeId, error ? "Não foi possível criar a tarefa (só admin pode editar)." : undefined);
}

export async function deleteStageTask(serviceTypeId: string, stageTaskId: string, formData?: FormData) {
  const o = origemDe(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("case_stage_tasks").delete().eq("id", stageTaskId);
  voltar(o, serviceTypeId, error ? "Não foi possível remover a tarefa (só admin pode editar)." : undefined);
}
