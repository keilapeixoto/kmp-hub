"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

function tipoDeVisto(formData: FormData): string | null {
  const v = formData.get("service_type_id");
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function createMessageTemplate(formData: FormData) {
  const nome = formData.get("nome");
  const canal = formData.get("canal");
  const idioma = formData.get("idioma");
  const assunto = formData.get("assunto");
  const corpo = formData.get("corpo");

  if (typeof nome !== "string" || !nome.trim()) return;
  if (typeof corpo !== "string" || !corpo.trim()) return;

  const supabase = await createClient();
  await supabase.from("message_templates").insert({
    nome: nome.trim(),
    canal: typeof canal === "string" && canal ? canal : "email",
    idioma: typeof idioma === "string" && idioma ? idioma : "pt",
    assunto: typeof assunto === "string" && assunto.trim() ? assunto.trim() : null,
    corpo: corpo.trim(),
    service_type_id: tipoDeVisto(formData),
  });

  revalidatePath("/templates");
}

/**
 * Edita um template existente (assunto/corpo/nome/canal/idioma) sem precisar
 * mexer em código — motivo desta ação existir: editar texto de e-mail direto
 * em arquivo .ts já quebrou o build do Hub duas vezes.
 */
export async function updateMessageTemplate(id: string, formData: FormData) {
  const nome = formData.get("nome");
  const canal = formData.get("canal");
  const idioma = formData.get("idioma");
  const assunto = formData.get("assunto");
  const corpo = formData.get("corpo");

  if (typeof nome !== "string" || !nome.trim()) return;
  if (typeof corpo !== "string" || !corpo.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("message_templates")
    .update({
      nome: nome.trim(),
      canal: typeof canal === "string" && canal ? canal : "email",
      idioma: typeof idioma === "string" && idioma ? idioma : "pt",
      assunto: typeof assunto === "string" && assunto.trim() ? assunto.trim() : null,
      corpo: corpo.trim(),
      service_type_id: tipoDeVisto(formData),
    })
    .eq("id", id);

  revalidatePath("/templates");
}

export async function deleteMessageTemplate(id: string) {
  const supabase = await createClient();
  // Templates com `chave` são usados pelo sistema (ex.: os 4 lembretes
  // automáticos do prazo de 28 dias) — excluir quebraria o envio. A UI já
  // esconde o botão nesse caso; este check é a segunda camada de proteção.
  await supabase.from("message_templates").delete().eq("id", id).is("chave", null);
  revalidatePath("/templates");
}

// ---------------------------------------------------------------------------
// Anexos fixos do template (bucket privado "email-anexos"). Só admin: o RLS
// da tabela e do bucket recusam qualquer outra função.
// ---------------------------------------------------------------------------

export async function addTemplateAttachment(templateId: string, formData: FormData) {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return;
  if (arquivo.size > 9 * 1024 * 1024) return; // limite do envio pelo Hub (10 MB por ação)

  const supabase = await createClient();
  const nomeSeguro = arquivo.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
  const caminho = `${templateId}/${randomUUID()}-${nomeSeguro}`;
  const { error: erroUpload } = await supabase.storage
    .from("email-anexos")
    .upload(caminho, arquivo, { contentType: arquivo.type || "application/octet-stream" });
  if (erroUpload) {
    console.error("[addTemplateAttachment] upload:", erroUpload.message);
    return;
  }
  const { error } = await supabase.from("message_template_attachments").insert({
    template_id: templateId,
    nome: arquivo.name,
    storage_path: caminho,
    tamanho: arquivo.size,
    content_type: arquivo.type || null,
  });
  if (error) {
    console.error("[addTemplateAttachment]", error.code, error.message);
    await supabase.storage.from("email-anexos").remove([caminho]);
  }
  revalidatePath("/templates");
}

export async function deleteTemplateAttachment(attachmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_template_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!data) return;
  const { error } = await supabase.from("message_template_attachments").delete().eq("id", attachmentId);
  if (!error) await supabase.storage.from("email-anexos").remove([data.storage_path as string]);
  revalidatePath("/templates");
}
