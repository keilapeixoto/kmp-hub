export const DEADLINE_WINDOW_DAYS = 28;

export const REQUEST_TYPES = [
  { slug: "exame_medico", label: "Exame médico" },
  { slug: "informacao_adicional", label: "Informação adicional" },
  { slug: "skills_assessment_pendente", label: "Skills assessment pendente" },
  { slug: "outro", label: "Outro" },
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number]["slug"];

export const REQUEST_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REQUEST_TYPES.map((t) => [t.slug, t.label]),
);

export const DEADLINE_STATUSES = [
  { slug: "aguardando_documento", label: "Aguardando documento" },
  { slug: "documento_recebido", label: "Documento recebido" },
  { slug: "extensao_solicitada", label: "Extensão solicitada" },
  { slug: "concluido", label: "Concluído" },
  { slug: "cancelado", label: "Cancelado" },
] as const;

export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number]["slug"];

export const DEADLINE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  DEADLINE_STATUSES.map((s) => [s.slug, s.label]),
);

export const REMINDER_MILESTONES = [14, 7, 3, 1] as const;

export type ReminderMilestone = (typeof REMINDER_MILESTONES)[number];

/** Dias restantes a partir dos quais um prazo "aguardando documento" vira alerta vermelho pra Keila (seção 4 da spec). */
export const DEADLINE_ALERT_THRESHOLD_DAYS = 7;

/** Dias restantes a partir dos quais skills_assessment_pendente sem confirmação alerta Keila a preparar a carta de extensão (seção 4). */
export const SKILLS_ASSESSMENT_ALERT_THRESHOLD_DAYS = 10;
