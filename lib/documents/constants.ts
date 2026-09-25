export const DOCUMENT_TYPES = [
  { slug: "passaporte", label: "Passaporte" },
  { slug: "extrato_bancario", label: "Extrato bancário" },
  { slug: "coe", label: "Confirmation of Enrolment (COE)" },
  { slug: "certidao_antecedentes", label: "Certidão de antecedentes" },
  { slug: "seguro_saude", label: "Seguro saúde" },
  { slug: "comprovante_ingles", label: "Comprovante de proficiência em inglês" },
  { slug: "comprovante_qualificacao", label: "Comprovante de qualificação" },
  { slug: "exame_medico", label: "Exame médico" },
  { slug: "skills_assessment", label: "Skills assessment" },
  { slug: "outro", label: "Outro" },
] as const;

export type DocumentTypeSlug = (typeof DOCUMENT_TYPES)[number]["slug"];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.slug, t.label]),
);

/** Abaixo disso, a classificação automática só sugere — a equipe confirma manualmente. */
export const DOCUMENT_CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Ponte entre document_type (classificação de documento) e case_deadlines.tipo_pedido
 * (o pedido de 28 dias do Department) — só os dois tipos específicos o
 * bastante para casar com confiança. "informacao_adicional"/"outro" são
 * genéricos demais para vincular automaticamente; ficam manuais.
 */
export const DOCUMENT_TYPE_TO_DEADLINE_REQUEST_TYPE: Record<string, string> = {
  exame_medico: "exame_medico",
  skills_assessment: "skills_assessment_pendente",
};
