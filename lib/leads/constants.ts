export const LEAD_STATUSES = [
  { slug: "novo", label: "Novo" },
  { slug: "contato_iniciado", label: "Contato iniciado" },
  { slug: "qualificacao", label: "Em qualificação" },
  { slug: "consulta_agendada", label: "Consulta agendada" },
  { slug: "consulta_realizada", label: "Consulta realizada" },
  { slug: "proposta_enviada", label: "Proposta enviada" },
  { slug: "negociacao", label: "Em negociação" },
  { slug: "aguardando_decisao", label: "Aguardando decisão" },
  { slug: "convertido", label: "Convertido" },
  { slug: "perdido", label: "Perdido" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["slug"];

export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.slug, s.label]),
);

export const CLOSED_LEAD_STATUSES = new Set<string>(["convertido", "perdido"]);

/** Dias sem contato a partir dos quais o lead ganha o alerta visual de inatividade. */
export const INACTIVITY_THRESHOLD_DAYS = 14;
