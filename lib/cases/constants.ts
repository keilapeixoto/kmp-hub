export const CASE_STATUSES = [
  { slug: "ativo", label: "Ativo" },
  { slug: "pausado", label: "Pausado" },
  { slug: "concluido", label: "Concluído" },
  { slug: "cancelado", label: "Cancelado" },
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number]["slug"];

export const CASE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  CASE_STATUSES.map((s) => [s.slug, s.label]),
);

export const CASE_PRIORITIES = [
  { slug: "baixa", label: "Baixa" },
  { slug: "media", label: "Média" },
  { slug: "alta", label: "Alta" },
] as const;

export type CasePriority = (typeof CASE_PRIORITIES)[number]["slug"];

export const CASE_PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  CASE_PRIORITIES.map((p) => [p.slug, p.label]),
);
