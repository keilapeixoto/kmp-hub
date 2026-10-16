"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssinaturaState = { error: string | null; ok: boolean };

const TIPOS_DE_IMAGEM = ["image/png", "image/jpeg", "image/gif"];

/**
 * Assinatura de e-mail de quem está logado (profiles.assinatura_*): cartão com
 * foto, cargo, contatos e aviso (assinatura_dados). Foto e logo vão para o
 * bucket público "avatars", na pasta do próprio usuário (o RLS de
 * storage.objects só deixa gravar ali). Sem arquivo novo, mantém o que havia.
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
  const campos: Record<string, unknown> = {
    assinatura_fecho: texto("fecho"),
    assinatura_whatsapp: texto("whatsapp"),
    assinatura_instagram: texto("instagram")?.replace(/^@/, "") ?? null,
  };

  // Fotos do cartão (bucket público avatars, pasta do usuário): foto e logo.
  async function subir(nomeCampo: string, nomeArquivo: string): Promise<string | null | { erro: string }> {
    const arquivo = formData.get(nomeCampo);
    if (!(arquivo instanceof File) || arquivo.size === 0) return null;
    if (!TIPOS_DE_IMAGEM.includes(arquivo.type)) {
      return { erro: "Use imagem PNG, JPG ou GIF (o Gmail não mostra SVG nem WebP)." };
    }
    if (arquivo.size > 2 * 1024 * 1024) return { erro: "A imagem passa de 2 MB. Exporte numa resolução menor." };
    const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/gif" ? "gif" : "jpg";
    const caminho = `${user!.id}/${nomeArquivo}.${ext}`;
    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });
    if (erroUpload) {
      console.error("[salvarAssinatura] upload:", erroUpload.message);
      return { erro: "Não foi possível enviar a imagem." };
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  const { data: atual } = await supabase.from("profiles").select("assinatura_dados").eq("user_id", user.id).maybeSingle();
  const dados: Record<string, string | null> = {
    ...(((atual as { assinatura_dados?: Record<string, string | null> } | null)?.assinatura_dados ?? {}) as Record<
      string,
      string | null
    >),
    cargo: texto("cargo"),
    credencial: texto("credencial"),
    slogan: texto("slogan"),
    telefone: texto("telefone"),
    email: texto("email"),
    aviso: texto("aviso"),
  };
  for (const [campo, arquivo, chave] of [
    ["foto", "assinatura-foto", "foto_url"],
    ["logo", "assinatura-logo", "logo_url"],
  ] as const) {
    const r = await subir(campo, arquivo);
    if (r && typeof r === "object") return { error: r.erro, ok: false };
    if (typeof r === "string") dados[chave] = r;
    if (formData.get(`remover_${campo}`) === "on") dados[chave] = null;
  }
  campos.assinatura_dados = dados;

  const { error } = await supabase.from("profiles").update(campos).eq("user_id", user.id);
  if (error) {
    console.error("[salvarAssinatura]", error.code, error.message);
    return {
      error:
        error.code === "PGRST204" || error.code === "42703"
          ? "Falta aplicar no Supabase a migração da assinatura em cartão (20261017150000)."
          : "Não foi possível salvar.",
      ok: false,
    };
  }
  revalidatePath("/perfil");
  return { error: null, ok: true };
}
