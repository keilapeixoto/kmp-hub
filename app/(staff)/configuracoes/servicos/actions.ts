"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ServiceTypeFormState = {
  error: string | null;
};

export async function createServiceType(
  _prevState: ServiceTypeFormState,
  formData: FormData,
): Promise<ServiceTypeFormState> {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");

  if (typeof nome !== "string" || !nome.trim()) {
    return { error: "Informe o nome do tipo de serviço." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_types")
    .insert({
      nome: nome.trim(),
      descricao:
        typeof descricao === "string" && descricao.trim()
          ? descricao.trim()
          : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o tipo de serviço." };
  }

  revalidatePath("/configuracoes/servicos");
  redirect(`/configuracoes/servicos/${data.id}`);
}

export async function updateServiceType(
  id: string,
  _prevState: ServiceTypeFormState,
  formData: FormData,
): Promise<ServiceTypeFormState> {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");

  if (typeof nome !== "string" || !nome.trim()) {
    return { error: "Informe o nome do tipo de serviço." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_types")
    .update({
      nome: nome.trim(),
      descricao:
        typeof descricao === "string" && descricao.trim()
          ? descricao.trim()
          : null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath(`/configuracoes/servicos/${id}`);
  return { error: null };
}

export async function addCaseStage(serviceTypeId: string, formData: FormData) {
  const nome = formData.get("nome");
  const ordem = formData.get("ordem");

  if (typeof nome !== "string" || !nome.trim()) return;
  const ordemNumero = Number(ordem);
  if (!Number.isFinite(ordemNumero)) return;

  const supabase = await createClient();
  await supabase.from("case_stages").insert({
    service_type_id: serviceTypeId,
    nome: nome.trim(),
    ordem: ordemNumero,
  });

  revalidatePath(`/configuracoes/servicos/${serviceTypeId}`);
}

export async function removeCaseStage(serviceTypeId: string, stageId: string) {
  const supabase = await createClient();
  await supabase.from("case_stages").delete().eq("id", stageId);
  revalidatePath(`/configuracoes/servicos/${serviceTypeId}`);
}

export async function archiveServiceType(id: string) {
  const supabase = await createClient();
  await supabase.from("service_types").update({ arquivado: true }).eq("id", id);
  revalidatePath("/configuracoes/servicos");
  revalidatePath(`/configuracoes/servicos/${id}`);
}

export async function reactivateServiceType(id: string) {
  const supabase = await createClient();
  await supabase.from("service_types").update({ arquivado: false }).eq("id", id);
  revalidatePath("/configuracoes/servicos");
  revalidatePath(`/configuracoes/servicos/${id}`);
}

export async function duplicateServiceType(id: string) {
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("service_types")
    .select("*")
    .eq("id", id)
    .single();
  if (!original) return;

  const { data: novo, error: novoError } = await supabase
    .from("service_types")
    .insert({
      nome: `${original.nome} (cópia)`,
      descricao: original.descricao,
      guia_id: original.guia_id,
    })
    .select("id")
    .single();
  if (novoError || !novo) return;

  const { data: stages } = await supabase
    .from("case_stages")
    .select("nome, ordem")
    .eq("service_type_id", id);
  if (stages && stages.length > 0) {
    await supabase.from("case_stages").insert(
      stages.map((s) => ({
        service_type_id: novo.id,
        nome: s.nome,
        ordem: s.ordem,
      })),
    );
  }

  if (original.checklist_template_id) {
    const { data: templateItems } = await supabase
      .from("checklist_template_items")
      .select("ordem, nome, descricao, exemplo, formato, validade_dias, obrigatorio, condicional")
      .eq("checklist_template_id", original.checklist_template_id);

    const { data: novoTemplate } = await supabase
      .from("checklist_templates")
      .insert({ service_type_id: novo.id, nome: `Checklist ${original.nome} (cópia)` })
      .select("id")
      .single();

    if (novoTemplate && templateItems && templateItems.length > 0) {
      await supabase.from("checklist_template_items").insert(
        templateItems.map((item) => ({
          ...item,
          checklist_template_id: novoTemplate.id,
        })),
      );
      await supabase
        .from("service_types")
        .update({ checklist_template_id: novoTemplate.id })
        .eq("id", novo.id);
    }
  }

  revalidatePath("/configuracoes/servicos");
  redirect(`/configuracoes/servicos/${novo.id}`);
}
