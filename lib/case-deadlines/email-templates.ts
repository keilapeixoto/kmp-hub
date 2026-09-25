import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ReminderMilestone } from "./constants";

export type ReminderTemplateVars = {
  nome_estudante: string;
  tipo_documento: string;
  data_limite: string;
  dias_restantes: number;
};

/** message_templates.chave dos 4 lembretes automáticos — ver migração 20260901150000. */
const MILESTONE_CHAVE: Record<ReminderMilestone, string> = {
  14: "lembrete_prazo_14",
  7: "lembrete_prazo_7",
  3: "lembrete_prazo_3",
  1: "lembrete_prazo_1",
};

function substitute(text: string, vars: ReminderTemplateVars): string {
  return text
    .replaceAll("{{nome_estudante}}", vars.nome_estudante)
    .replaceAll("{{tipo_documento}}", vars.tipo_documento)
    .replaceAll("{{data_limite}}", vars.data_limite)
    .replaceAll("{{dias_restantes}}", String(vars.dias_restantes));
}

/** Fallback em texto puro (preview no painel e clientes de e-mail que bloqueiam imagem). */
const ASSINATURA_TEXTO = ["Atenciosamente,", "Keila Mayara Peixoto", "KMP Consulting"];

/**
 * Imagem hospedada como asset público do próprio Hub. Usa VERCEL_URL (o
 * domínio exato do deploy que está rodando agora) em vez de
 * NEXT_PUBLIC_SITE_URL — esse aponta pro domínio de produção mesmo rodando
 * num preview de branch, e a imagem só existe onde o código dela foi
 * deployado, então a URL de produção 404 até esta branch virar produção.
 */
function assinaturaHtml(): string {
  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  return [
    "<p>Atenciosamente,</p>",
    `<img src="${siteUrl}/assinatura-keila.png" alt="Keila Peixoto — KMP Consulting" width="480" style="max-width:480px;height:auto;border:0;display:block;" />`,
  ].join("\n");
}

function toHtml(paragraphs: string[], vars: ReminderTemplateVars): string {
  const corpo = paragraphs.map((p) => `<p>${substitute(p, vars)}</p>`).join("\n");
  return `${corpo}\n${assinaturaHtml()}`;
}

/**
 * Texto dos 4 lembretes vem de message_templates (chave lembrete_prazo_14/7/3/1),
 * editável em /templates — não mais hardcoded aqui. Isso existe porque editar
 * texto direto neste arquivo já quebrou o build duas vezes (vírgula faltando,
 * depois pontuação) quando editado fora do fluxo normal de commit.
 */
export async function getReminderEmail(
  milestone: ReminderMilestone,
  vars: ReminderTemplateVars,
): Promise<{ subject: string; html: string; paragraphs: string[] }> {
  const supabase = await createSupabaseClient();
  const { data: template } = await supabase
    .from("message_templates")
    .select("assunto, corpo")
    .eq("chave", MILESTONE_CHAVE[milestone])
    .maybeSingle<{ assunto: string | null; corpo: string }>();

  if (!template) {
    throw new Error(
      `Template do lembrete de ${milestone} dias não encontrado — confirme se a migração 20260901150000_message_templates_reminder_fields.sql já rodou no Supabase.`,
    );
  }

  const paragraphs = template.corpo
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    subject: substitute(template.assunto ?? "", vars),
    html: toHtml(paragraphs, vars),
    paragraphs: [...paragraphs.map((p) => substitute(p, vars)), ...ASSINATURA_TEXTO],
  };
}
