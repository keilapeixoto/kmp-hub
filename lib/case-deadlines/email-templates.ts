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

function toHtml(paragraphs: string[], vars: ReminderTemplateVars): string {
  return paragraphs.map((p) => `<p>${substitute(p, vars)}</p>`).join("\n");
}

const ASSINATURA = ["Atenciosamente,", "Keila Mayara Peixoto", "KMP Consulting"];

const TEMPLATES: Record<ReminderMilestone, { subject: string; paragraphs: string[] }> = {
  14: {
    subject: "Lembrete: documento pendente para sua aplicação de visto",
    paragraphs: [
      "Olá {nome_estudante},",
      "Espero que esteja bem.",
      "Este é um lembrete de que o Department of Home Affairs solicitou {tipo_documento} para o andamento da sua aplicação de visto. O prazo final para envio é {data_limite}.",
      "Peço que assim que possível você me envie esse documento, para garantir que tudo seja anexado à aplicação dentro do prazo.",
      "Qualquer dúvida sobre como obter ou enviar o documento, estou à disposição.",
      ...ASSINATURA,
    ],
  },
  7: {
    subject: "Prazo se aproximando: documento ainda pendente",
    paragraphs: [
      "Olá {nome_estudante},",
      "Faltam {dias_restantes} dias para o prazo final de {data_limite} referente a {tipo_documento} da sua aplicação de visto.",
      "Ainda não recebi esse documento. Peço que você me envie o quanto antes, porque o Department não costuma aceitar atraso nesse tipo de prazo.",
      "Se já enviou e eu não recebi, por favor me avise para verificarmos juntos.",
      ...ASSINATURA,
    ],
  },
  3: {
    subject: "Urgente: faltam {dias_restantes} dias para o prazo da sua aplicação",
    paragraphs: [
      "Olá {nome_estudante},",
      "Faltam apenas {dias_restantes} dias para o prazo final de {data_limite} referente a {tipo_documento}.",
      "Este documento ainda não chegou até mim. Preciso que você envie hoje ou amanhã, porque perder esse prazo pode gerar consequências sérias para sua aplicação de visto, incluindo possível recusa.",
      "Se está com alguma dificuldade para obter o documento, me avise agora mesmo para vermos juntos uma solução antes que o prazo vença.",
      ...ASSINATURA,
    ],
  },
  1: {
    subject: "Último aviso: prazo vence amanhã, {data_limite}",
    paragraphs: [
      "Olá {nome_estudante},",
      "Este é o último lembrete automático. O prazo para envio de {tipo_documento} vence amanhã, {data_limite}.",
      "Se esse documento não for enviado até o prazo, sua aplicação de visto corre risco real de ser recusada por falta de resposta ao Department dentro do tempo estipulado.",
      "Por favor, me envie o documento hoje, ou entre em contato comigo imediatamente se houver algum impedimento, para que possamos avaliar as opções ainda disponíveis.",
      ...ASSINATURA,
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
    html: toHtml(template.paragraphs, vars),
    paragraphs: template.paragraphs.map((p) => substitute(p, vars)),
  };
}
