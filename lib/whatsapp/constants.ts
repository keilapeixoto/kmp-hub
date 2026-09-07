export const CONVERSATION_STAGES = [
  { slug: "novo_contato", label: "Novo contato" },
  { slug: "aguardando_resposta_cliente", label: "Aguardando resposta do cliente" },
  { slug: "aguardando_resposta_equipe", label: "Aguardando resposta da equipe" },
  { slug: "pendencia_documento", label: "Pendência de documento" },
  { slug: "agendamento", label: "Agendamento" },
  { slug: "resolvido", label: "Resolvido" },
] as const;

export type ConversationStage = (typeof CONVERSATION_STAGES)[number]["slug"];

export const CONVERSATION_STAGE_ORDER: ConversationStage[] = CONVERSATION_STAGES.map(
  (s) => s.slug,
);

export const CONVERSATION_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  CONVERSATION_STAGES.map((s) => [s.slug, s.label]),
);

export const MESSAGE_TYPES = [
  { slug: "texto", label: "Texto" },
  { slug: "audio", label: "Áudio" },
  { slug: "imagem", label: "Imagem" },
  { slug: "documento", label: "Documento" },
  { slug: "outro", label: "Outro" },
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number]["slug"];

export const TEMPLATE_TYPES = [
  { slug: "texto", label: "Texto" },
  { slug: "audio", label: "Áudio" },
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number]["slug"];
