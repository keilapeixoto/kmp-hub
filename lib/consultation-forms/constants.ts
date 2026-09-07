export const TRAJ_STATUS = [
  { slug: "done", label: "Concluído", color: "green" },
  { slug: "progress", label: "Em andamento", color: "amber" },
  { slug: "next", label: "Próximo passo", color: "orange" },
] as const;

export type TrajStatusSlug = (typeof TRAJ_STATUS)[number]["slug"];

export const ACTION_STATUS = [
  { slug: "progress", label: "Em andamento", color: "amber" },
  { slug: "next", label: "Pendente", color: "orange" },
  { slug: "done", label: "Concluído", color: "green" },
] as const;

export type ActionStatusSlug = (typeof ACTION_STATUS)[number]["slug"];

export const ACTION_RESP = [
  { slug: "kmp", label: "KMP Consulting", color: "orange" },
  { slug: "parceira", label: "Agência Parceira", color: "green" },
  { slug: "aplicantes", label: "Aplicantes", color: "blue" },
  { slug: "outro", label: "Outro", color: "muted" },
] as const;

export type ActionRespSlug = (typeof ACTION_RESP)[number]["slug"];

/** Chaves top-level de ConsultationFormData que a extração por IA pode preencher — usadas em ai_pending_sections. */
export const AI_FILLABLE_SECTIONS = [
  "clientNames",
  "date",
  "panorama",
  "exp",
  "traj",
  "notes",
  "steps",
  "strategyNote",
  "benefitNote",
  "actions",
] as const;

export const SECTION_LABELS: Record<string, string> = {
  clientNames: "Nome dos clientes",
  date: "Data",
  panorama: "Panorama Atual",
  exp: "Experiência Profissional",
  traj: "Trajetória Acadêmica",
  notes: "Informações Importantes Discutidas",
  steps: "Caminho Recomendado",
  strategyNote: "Caminho Recomendado",
  benefitNote: "Caminho Recomendado",
  actions: "Plano de Ação",
};
