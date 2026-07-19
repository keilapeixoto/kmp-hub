"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createMessageTemplate(formData: FormData) {
  const nome = formData.get("nome");
  const canal = formData.get("canal");
  const idioma = formData.get("idioma");
  const corpo = formData.get("corpo");

  if (typeof nome !== "string" || !nome.trim()) return;
  if (typeof corpo !== "string" || !corpo.trim()) return;

  const supabase = await createClient();
  await supabase.from("message_templates").insert({
    nome: nome.trim(),
    canal: typeof canal === "string" && canal ? canal : "email",
    idioma: typeof idioma === "string" && idioma ? idioma : "pt",
    corpo: corpo.trim(),
  });

  revalidatePath("/templates");
}

export async function deleteMessageTemplate(id: string) {
  const supabase = await createClient();
  await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath("/templates");
}
