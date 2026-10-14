"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { proximaOrdem, trocaDeOrdem } from "@/lib/cases/etapas";

// Editar as etapas (colunas) da pipeline de um tipo de serviço, direto da
// pipeline. As permissões são as do banco: só admin altera case_stages (RLS).

function voltar(serviceTypeId: string, erro?: string): never {
  revalidatePath("/processos");
  revalidatePath(`/configuracoes/servicos/${serviceTypeId}`);
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
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) voltar(serviceTypeId, "Escreva o nome da etapa.");
  const { supabase, etapas } = await etapasDo(serviceTypeId);
  const { error } = await supabase
    .from("case_stages")
    .insert({ service_type_id: serviceTypeId, nome, ordem: proximaOrdem(etapas) });
  voltar(serviceTypeId, error ? "Não foi possível criar a etapa (só admin pode editar)." : undefined);
}

export async function renameStage(serviceTypeId: string, stageId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) voltar(serviceTypeId, "O nome da etapa não pode ficar vazio.");
  const supabase = await createClient();
  const { error } = await supabase.from("case_stages").update({ nome }).eq("id", stageId);
  voltar(serviceTypeId, error ? "Não foi possível renomear (só admin pode editar)." : undefined);
}

export async function moveStage(serviceTypeId: string, stageId: string, direcao: "subir" | "descer") {
  const { supabase, etapas } = await etapasDo(serviceTypeId);
  const troca = trocaDeOrdem(etapas, stageId, direcao);
  if (!troca) voltar(serviceTypeId);
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
    if (error) voltar(serviceTypeId, "Não foi possível mudar a ordem (só admin pode editar).");
  }
  voltar(serviceTypeId);
}

export async function deleteStage(serviceTypeId: string, stageId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("etapa_id", stageId);
  if ((count ?? 0) > 0) {
    voltar(serviceTypeId, `Esta etapa tem ${count} processo(s). Mova-os para outra etapa antes de remover.`);
  }
  const { error } = await supabase.from("case_stages").delete().eq("id", stageId);
  voltar(serviceTypeId, error ? "Não foi possível remover (só admin pode editar)." : undefined);
}
