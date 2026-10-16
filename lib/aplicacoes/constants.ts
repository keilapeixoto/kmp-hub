// Andamento da aplicação no Department e do skills assessment (migração
// 20261016170000_application_status.sql). Mesmas listas do CHECK do banco.

export const APLICACAO_STATUS = [
  { slug: "nao_enviada", label: "Não enviada" },
  { slug: "enviada", label: "Enviada (lodged)" },
  { slug: "em_analise", label: "Em análise" },
  { slug: "pedido_informacao", label: "Pedido de informação (RFI)" },
  { slug: "concedida", label: "Concedida" },
  { slug: "recusada", label: "Recusada" },
  { slug: "retirada", label: "Retirada" },
] as const;

export type AplicacaoStatus = (typeof APLICACAO_STATUS)[number]["slug"];

export const APLICACAO_LABELS: Record<string, string> = Object.fromEntries(
  APLICACAO_STATUS.map((s) => [s.slug, s.label]),
);

export const SKILLS_STATUS = [
  { slug: "nao_se_aplica", label: "Não se aplica" },
  { slug: "a_aplicar", label: "A aplicar" },
  { slug: "aplicado", label: "Aplicado" },
  { slug: "aprovado", label: "Aprovado" },
  { slug: "negado", label: "Negado" },
] as const;

export const SKILLS_LABELS: Record<string, string> = Object.fromEntries(
  SKILLS_STATUS.map((s) => [s.slug, s.label]),
);

/** Colunas do quadro de Aplicações (retirada fica junto de recusada). */
export const COLUNAS_APLICACAO: { slug: AplicacaoStatus; cor: "cinza" | "azul" | "amarelo" | "laranja" | "verde" | "vermelho" }[] = [
  { slug: "nao_enviada", cor: "cinza" },
  { slug: "enviada", cor: "azul" },
  { slug: "em_analise", cor: "amarelo" },
  { slug: "pedido_informacao", cor: "laranja" },
  { slug: "concedida", cor: "verde" },
  { slug: "recusada", cor: "vermelho" },
];
