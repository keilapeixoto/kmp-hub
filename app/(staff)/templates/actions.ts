"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
