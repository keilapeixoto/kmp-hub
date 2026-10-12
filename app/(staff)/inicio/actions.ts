"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NewsFormState = {
  error: string | null;
};

export async function addImmigrationNews(
  _prevState: NewsFormState,
  formData: FormData,
): Promise<NewsFormState> {
  const titulo = formData.get("titulo");
  const link = formData.get("link");
  const fonte = formData.get("fonte");

  if (typeof titulo !== "string" || !titulo.trim()) {
    return { error: "Escreva o título da novidade." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("immigration_news").insert({
    titulo: titulo.trim(),
    link: typeof link === "string" && link.trim() ? link.trim() : null,
    fonte: typeof fonte === "string" && fonte.trim() ? fonte.trim() : null,
  });

  if (error) {
    return { error: "Não foi possível publicar — tente de novo." };
  }

  revalidatePath("/inicio");
  return { error: null };
}

export async function deleteImmigrationNews(id: string) {
  const supabase = await createClient();
  await supabase.from("immigration_news").delete().eq("id", id);
  revalidatePath("/inicio");
}
