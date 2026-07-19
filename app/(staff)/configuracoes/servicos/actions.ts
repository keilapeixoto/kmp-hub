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
