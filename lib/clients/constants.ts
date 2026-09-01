export const CLIENT_RELATION_TYPES = [
  { slug: "conjuge", label: "Cônjuge" },
  { slug: "filho", label: "Filho(a)" },
  { slug: "pai_mae", label: "Pai/Mãe" },
  { slug: "outro", label: "Outro" },
] as const;

export type ClientRelationType = (typeof CLIENT_RELATION_TYPES)[number]["slug"];

export const CLIENT_RELATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CLIENT_RELATION_TYPES.map((t) => [t.slug, t.label]),
);

/** Dias até o vencimento a partir dos quais um documento de identidade ganha alerta (ver wireframe da seção 7). */
export const DOCUMENT_EXPIRY_THRESHOLD_DAYS = 90;

/** Limites padrão (dias restantes) do painel de vencimento de vistos — ver docs/spec-vencimento-vistos.md. */
export const VISA_ALERT_THRESHOLDS = {
  critico: 30,
  atencao: 60,
  monitorar: 90,
} as const;

export type VisaUrgency = "vencido" | "critico" | "atencao" | "monitorar" | "sem_urgencia";

export const VISA_URGENCY_LABELS: Record<VisaUrgency, string> = {
  vencido: "Vencido",
  critico: "Crítico",
  atencao: "Atenção",
  monitorar: "Monitorar",
  sem_urgencia: "Sem urgência",
};
