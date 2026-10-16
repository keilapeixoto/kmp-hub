"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssinaturaState = { error: string | null; ok: boolean };

const TIPOS_DE_IMAGEM = ["image/png", "image/jpeg", "image/gif"];

/**
 * Assinatura de e-mail de quem está logado (profiles.assinatura_*). A imagem
 * vai para o bucket público "avatars", na pasta do próprio usuário (o RLS de
 * storage.objects só deixa gravar ali). Sem arquivo novo, mantém a imagem.
 */
export async function salvarAssinatura(_prev: AssinaturaState, formData: FormData): Promise<AssinaturaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — entre de novo.", ok: false };

  const texto = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const campos: Record<string, string | null> = {
    assinatura_fecho: texto("fecho"),
    assinatura_whatsapp: texto("whatsapp"),
    assinatura_instagram: texto("instagram")?.replace(/^@/, "") ?? null,
  };

  const arquivo = formData.get("imagem");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (!TIPOS_DE_IMAGEM.includes(arquivo.type)) {
      return { error: "Use uma imagem PNG, JPG ou GIF (o Gmail não mostra SVG nem WebP).", ok: false };
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      return { error: "A imagem passa de 2 MB. Exporte numa resolução menor.", ok: false };
    }
    const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/gif" ? "gif" : "jpg";
    const caminho = `${user.id}/assinatura.${ext}`;
    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });
    if (erroUpload) {
      console.error("[salvarAssinatura] upload:", erroUpload.message);
      return { error: "Não foi possível enviar a imagem.", ok: false };
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    campos.assinatura_url = `${data.publicUrl}?v=${Date.now()}`;
  }
  if (formData.get("remover_imagem") === "on") campos.assinatura_url = null;

  const { error } = await supabase.from("profiles").update(campos).eq("user_id", user.id);
  if (error) {
    console.error("[salvarAssinatura]", error.code, error.message);
    return {
      error:
        error.code === "PGRST204" || error.code === "42703"
          ? "A assinatura ainda não foi ativada no banco (migração 20261016160000)."
          : "Não foi possível salvar.",
      ok: false,
    };
  }
  revalidatePath("/perfil");
  return { error: null, ok: true };
}
