export const TASK_STATUSES = [
  { slug: "pendente", label: "Pendente" },
  { slug: "em_andamento", label: "Em andamento" },
  { slug: "concluida", label: "Concluída" },
  { slug: "cancelada", label: "Cancelada" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["slug"];

export const TASK_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.slug, s.label]),
);

export const OPEN_TASK_STATUSES: TaskStatus[] = ["pendente", "em_andamento"];

export const TASK_PRIORITIES = [
  { slug: "baixa", label: "Baixa" },
  { slug: "media", label: "Média" },
  { slug: "alta", label: "Alta" },
] as const;

export const TASK_PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.slug, p.label]),
);
