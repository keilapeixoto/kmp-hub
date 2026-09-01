import type { ReminderMilestone } from "./constants";

export type ReminderTemplateVars = {
  nome_estudante: string;
  tipo_documento: string;
  data_limite: string;
  dias_restantes: number;
};

function substitute(text: string, vars: ReminderTemplateVars): string {
  return text
    .replaceAll("{nome_estudante}", vars.nome_estudante)
    .replaceAll("{tipo_documento}", vars.tipo_documento)
    .replaceAll("{data_limite}", vars.data_limite)
    .replaceAll("{dias_restantes}", String(vars.dias_restantes));
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
    `<img src="${siteUrl}/assinatura-keila.png" alt="Keila Peixoto — KMP Consulting" width="360" style="max-width:360px;height:auto;border:0;display:block;" />`,
  ].join("\n");
}

function toHtml(corpo: string[], vars: ReminderTemplateVars): string {
  const paragrafos = corpo.map((p) => `<p>${substitute(p, vars)}</p>`).join("\n");
  return `${paragrafos}\n${assinaturaHtml()}`;
}

const TEMPLATES: Record<ReminderMilestone, { subject: string; corpo: string[] }> = {
  14: {
    subject: "Lembrete: documento pendente para sua aplicação de visto",
    corpo: [
      "Olá {nome_estudante},",
      "Espero que esteja bem.",
      "Este é um lembrete de que o Department of Home Affairs solicitou {tipo_documento} para o andamento da sua aplicação de visto. O prazo final para envio é {data_limite}.",
      "Peço que assim que possível você me envie esse documento, para garantir que tudo seja anexado à aplicação dentro do prazo.",
      "Qualquer dúvida sobre como obter ou enviar o documento, estou à disposição.",
    ],
  },
  7: {
    subject: "Prazo se aproximando: documento ainda pendente",
    corpo: [
      "Olá {nome_estudante},",
      "Faltam {dias_restantes} dias para o prazo final de {data_limite} referente a {tipo_documento} da sua aplicação de visto.",
      "Ainda não recebi esse documento. Peço que você me envie o quanto antes, porque o Department não costuma aceitar atraso nesse tipo de prazo.",
      "Se já enviou e eu não recebi, por favor me avise para verificarmos juntos.",
    ],
  },
  3: {
    subject: "Urgente: faltam {dias_restantes} dias para o prazo da sua aplicação",
    corpo: [
      "Olá {nome_estudante},",
      "Faltam apenas {dias_restantes} dias para o prazo final de {data_limite} referente a {tipo_documento}.",
      "Este documento ainda não chegou até mim. Preciso que você envie hoje ou amanhã, porque perder esse prazo pode gerar consequências sérias para sua aplicação de visto, incluindo possível recusa.",
      "Se está com alguma dificuldade para obter o documento, me avise agora mesmo para vermos juntos uma solução antes que o prazo vença.",
    ],
  },
  1: {
    subject: "Último aviso: prazo vence amanhã, {data_limite}",
    corpo: [
      "Olá {nome_estudante},",
      "Este é o último lembrete automático. O prazo para envio de {tipo_documento} vence amanhã, {data_limite}.",
      "Se esse documento não for enviado até o prazo, sua aplicação de visto corre risco real de ser recusada por falta de resposta ao Department dentro do tempo estipulado.",
      "Por favor, me envie o documento hoje, ou entre em contato comigo imediatamente se houver algum impedimento, para que possamos avaliar as opções ainda disponíveis.",
    ],
  },
};

export function getReminderEmail(
  milestone: ReminderMilestone,
  vars: ReminderTemplateVars,
): { subject: string; html: string; paragraphs: string[] } {
  const template = TEMPLATES[milestone];
  return {
    subject: substitute(template.subject, vars),
    html: toHtml(template.corpo, vars),
    paragraphs: [
      ...template.corpo.map((p) => substitute(p, vars)),
      ...ASSINATURA_TEXTO,
    ],
  };
}
