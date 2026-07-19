"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createChecklistTemplate(
  serviceTypeId: string,
  formData: FormData,
) {
  const nome = formData.get("nome");
  if (typeof nome !== "string" || !nome.trim()) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .insert({ service_type_id: serviceTypeId, nome: nome.trim() })
    .select("id")
    .single();

  if (error || !data) return;

  await supabase
    .from("service_types")
    .update({ checklist_template_id: data.id })
    .eq("id", serviceTypeId);

  revalidatePath(`/configuracoes/servicos/${serviceTypeId}`);
  redirect(`/configuracoes/checklists/${data.id}`);
}

export async function addChecklistTemplateItem(
  templateId: string,
  formData: FormData,
) {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");
  const exemplo = formData.get("exemplo");
  const formato = formData.get("formato");
  const validadeDias = formData.get("validade_dias");
  const ordem = formData.get("ordem");
  const obrigatorio = formData.get("obrigatorio") === "on";
  const condicional = formData.get("condicional") === "on";

  if (typeof nome !== "string" || !nome.trim()) return;
  const ordemNumero = Number(ordem);
  if (!Number.isFinite(ordemNumero)) return;

  const supabase = await createClient();
  await supabase.from("checklist_template_items").insert({
    checklist_template_id: templateId,
    nome: nome.trim(),
    descricao:
      typeof descricao === "string" && descricao.trim() ? descricao.trim() : null,
    exemplo: typeof exemplo === "string" && exemplo.trim() ? exemplo.trim() : null,
    formato: typeof formato === "string" && formato.trim() ? formato.trim() : null,
    validade_dias:
      typeof validadeDias === "string" && validadeDias.trim()
        ? Number(validadeDias)
        : null,
    ordem: ordemNumero,
    obrigatorio,
    condicional,
  });

  revalidatePath(`/configuracoes/checklists/${templateId}`);
}

export async function removeChecklistTemplateItem(
  templateId: string,
  itemId: string,
) {
  const supabase = await createClient();
  await supabase.from("checklist_template_items").delete().eq("id", itemId);
  revalidatePath(`/configuracoes/checklists/${templateId}`);
}
