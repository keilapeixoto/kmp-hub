export const CHECKLIST_ITEM_STATUSES = [
  { slug: "nao_solicitado", label: "Não solicitado" },
  { slug: "solicitado", label: "Solicitado" },
  { slug: "aguardando_cliente", label: "Aguardando cliente" },
  { slug: "enviado", label: "Enviado" },
  { slug: "em_analise", label: "Em análise" },
  { slug: "rejeitado", label: "Rejeitado" },
  { slug: "reenvio_solicitado", label: "Reenvio solicitado" },
  { slug: "reenviado", label: "Reenviado" },
  { slug: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { slug: "aprovado", label: "Aprovado" },
] as const;

export type ChecklistItemStatus = (typeof CHECKLIST_ITEM_STATUSES)[number]["slug"];

export const CHECKLIST_ITEM_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  CHECKLIST_ITEM_STATUSES.map((s) => [s.slug, s.label]),
);
