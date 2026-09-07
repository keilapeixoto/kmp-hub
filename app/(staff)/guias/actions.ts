"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GUIDES_BUCKET } from "@/lib/guides/data";

export type GuideFormState = {
  error: string | null;
};

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

function pdfFromForm(formData: FormData): File | null {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) return null;
  return file;
}

async function uploadGuidePdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  guideId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  if (file.type !== "application/pdf") {
    return { path: null, error: "O anexo precisa ser um arquivo PDF." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { path: null, error: "O PDF não pode passar de 20 MB." };
  }

  const path = `${guideId}/${file.name}`;
  const { error } = await supabase.storage
    .from(GUIDES_BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (error) {
    return { path: null, error: "Não foi possível enviar o PDF." };
  }
  return { path, error: null };
}

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

  const pdf = pdfFromForm(formData);
  if (pdf) {
    const uploaded = await uploadGuidePdf(supabase, data.id, pdf);
    if (uploaded.error) return { error: uploaded.error };
    await supabase
      .from("guides")
      .update({ pdf_storage_path: uploaded.path })
      .eq("id", data.id);
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

  const update: Record<string, unknown> = {
    titulo: titulo.trim(),
    conteudo: conteudo.trim(),
    service_type_id:
      typeof serviceTypeId === "string" && serviceTypeId.trim()
        ? serviceTypeId.trim()
        : null,
  };

  const pdf = pdfFromForm(formData);
  if (pdf) {
    const uploaded = await uploadGuidePdf(supabase, id, pdf);
    if (uploaded.error) return { error: uploaded.error };
    update.pdf_storage_path = uploaded.path;
  }

  const { error } = await supabase.from("guides").update(update).eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/guias");
  revalidatePath(`/guias/${id}`);
  redirect(`/guias/${id}`);
}

export async function removeGuidePdf(id: string) {
  const supabase = await createClient();
  const { data: guide } = await supabase
    .from("guides")
    .select("pdf_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (guide?.pdf_storage_path) {
    await supabase.storage.from(GUIDES_BUCKET).remove([guide.pdf_storage_path]);
  }
  await supabase.from("guides").update({ pdf_storage_path: null }).eq("id", id);

  revalidatePath(`/guias/${id}`);
  redirect(`/guias/${id}`);
}

export async function archiveGuide(id: string) {
  const supabase = await createClient();
  await supabase.from("guides").update({ status: "arquivado" }).eq("id", id);
  revalidatePath("/guias");
  redirect("/guias");
}
