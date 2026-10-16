import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { DadosDaAssinatura } from "./assinatura";
import { siteUrl } from "@/lib/dominios";

// Dados do envio de e-mail (migração 20261016160000_email_templates.sql), com
// a sessão de quem está logado. Antes de a migração ser aplicada, devolve o
// que der (templates sem anexos, sem assinatura) em vez de quebrar a página.

export type AnexoDoTemplate = { id: string; nome: string; tamanho: number };

export type TemplateDeEmail = {
  id: string;
  nome: string;
  assunto: string | null;
  corpo: string;
  idioma: string;
  service_type_id: string | null;
  anexos: AnexoDoTemplate[];
};

export async function getTemplatesDeEmail(): Promise<TemplateDeEmail[]> {
  const supabase = await createSupabaseClient();
  const comTipo = await supabase
    .from("message_templates")
    .select("id, nome, assunto, corpo, idioma, service_type_id, chave")
    .eq("canal", "email")
    .order("nome");
  // Sem a coluna nova ainda: lê sem service_type_id.
  const linhas = comTipo.error
    ? (
        await supabase
          .from("message_templates")
          .select("id, nome, assunto, corpo, idioma, chave")
          .eq("canal", "email")
          .order("nome")
      ).data
    : comTipo.data;

  const { data: anexos } = await supabase
    .from("message_template_attachments")
    .select("id, template_id, nome, tamanho")
    .order("nome");

  return (linhas ?? [])
    // Templates com chave são os automáticos do sistema (lembretes de prazo).
    .filter((t) => !t.chave)
    .map((t) => ({
      id: t.id as string,
      nome: t.nome as string,
      assunto: (t.assunto as string | null) ?? null,
      corpo: t.corpo as string,
      idioma: t.idioma as string,
      service_type_id: ((t as { service_type_id?: string | null }).service_type_id ?? null) as string | null,
      anexos: (anexos ?? [])
        .filter((a) => a.template_id === t.id)
        .map((a) => ({ id: a.id as string, nome: a.nome as string, tamanho: Number(a.tamanho) })),
    }));
}

/** Assinatura de quem está logado (vazia se não configurada ou antes da migração). */
export async function getMinhaAssinatura(userId: string, nome: string): Promise<DadosDaAssinatura> {
  const supabase = await createSupabaseClient();
  const colunas = "assinatura_url, assinatura_fecho, assinatura_whatsapp, assinatura_instagram";
  let { data, error } = await supabase
    .from("profiles")
    .select(`${colunas}, assinatura_dados`)
    .eq("user_id", userId)
    .maybeSingle();
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    // Antes da migração 20261017150000: sem o cartão.
    ({ data, error } = await supabase.from("profiles").select(colunas).eq("user_id", userId).maybeSingle());
  }
  if (error || !data) return { url: null, fecho: null, whatsapp: null, instagram: null, nome };
  const d = ((data as { assinatura_dados?: Record<string, string | null> }).assinatura_dados ?? {}) as Record<
    string,
    string | null
  >;
  const texto = (k: string) => (typeof d[k] === "string" && d[k]!.trim() ? d[k]!.trim() : null);
  return {
    url: data.assinatura_url ?? null,
    fecho: data.assinatura_fecho ?? null,
    whatsapp: data.assinatura_whatsapp ?? null,
    instagram: data.assinatura_instagram ?? null,
    nome,
    cartao: {
      cargo: texto("cargo"),
      credencial: texto("credencial"),
      slogan: texto("slogan"),
      telefone: texto("telefone"),
      email: texto("email"),
      fotoUrl: texto("foto_url"),
      logoUrl: texto("logo_url"),
      aviso: texto("aviso"),
      baseUrl: siteUrl(),
    },
  };
}
