"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type GuideFormState = {
  error: string | null;
};

export async function createGuide(
  _prevState: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const titulo = formData.get("titulo");
  const conteudo = formData.get("conteudo");
  const serviceTypeId = formData.get("service_type_id");

  if (typeof titulo !== "string" || !titulo.trim()) {
    return { error: "Informe o título do guia." };
  }
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    return { error: "Informe o conteúdo do guia." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guides")
    .insert({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      service_type_id:
        typeof serviceTypeId === "string" && serviceTypeId.trim()
          ? serviceTypeId.trim()
          : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o guia." };
  }

  revalidatePath("/guias");
  redirect(`/guias/${data.id}`);
}

export async function updateGuide(
  id: string,
  _prevState: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const titulo = formData.get("titulo");
  const conteudo = formData.get("conteudo");
  const serviceTypeId = formData.get("service_type_id");

  if (typeof titulo !== "string" || !titulo.trim()) {
    return { error: "Informe o título do guia." };
  }
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    return { error: "Informe o conteúdo do guia." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("guides")
    .update({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      service_type_id:
        typeof serviceTypeId === "string" && serviceTypeId.trim()
          ? serviceTypeId.trim()
          : null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/guias");
  revalidatePath(`/guias/${id}`);
  redirect(`/guias/${id}`);
}

export async function archiveGuide(id: string) {
  const supabase = await createClient();
  await supabase.from("guides").update({ status: "arquivado" }).eq("id", id);
  revalidatePath("/guias");
  redirect("/guias");
}
