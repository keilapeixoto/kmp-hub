// Uma cor por módulo — o laranja (brand) é a cor de maior peso (views
// principais, destaque de "atenção necessária"); as demais só existem
// pra diferenciar módulo de módulo de relance. Ver
// docs/architecture/05-design-system.md.
export type Accent =
  | "brand"
  | "leads"
  | "clientes"
  | "processos"
  | "agenda"
  | "documentos"
  | "config"
  | "finance"
  | "alert";

// Só o ícone (tile) — o destaque da linha ativa da sidebar não varia mais
// por módulo (ver Sidebar), fundo escuro não combina com o tom claro por
// módulo que essa variação usava antes.
export const ACCENT_STYLES: Record<Accent, { tile: string }> = {
  brand: {
    tile: "bg-gradient-to-br from-kmp-orange to-kmp-orange-deep text-white shadow-sm shadow-kmp-orange/40",
  },
  leads: {
    tile: "bg-gradient-to-br from-kmp-leads to-kmp-leads-deep text-white shadow-sm shadow-kmp-leads/40",
  },
  clientes: {
    tile: "bg-gradient-to-br from-kmp-clientes to-kmp-clientes-deep text-white shadow-sm shadow-kmp-clientes/40",
  },
  processos: {
    tile: "bg-gradient-to-br from-kmp-processos to-kmp-processos-deep text-white shadow-sm shadow-kmp-processos/40",
  },
  agenda: {
    tile: "bg-gradient-to-br from-kmp-agenda to-kmp-agenda-deep text-white shadow-sm shadow-kmp-agenda/40",
  },
  documentos: {
    tile: "bg-gradient-to-br from-kmp-documentos to-kmp-documentos-deep text-white shadow-sm shadow-kmp-documentos/40",
  },
  config: {
    tile: "bg-gradient-to-br from-kmp-config to-kmp-config-deep text-white shadow-sm shadow-kmp-config/40",
  },
  finance: {
    tile: "bg-gradient-to-br from-kmp-finance to-kmp-finance-deep text-white shadow-sm shadow-kmp-finance/40",
  },
  alert: {
    tile: "bg-gradient-to-br from-kmp-alert to-kmp-alert-deep text-white shadow-sm shadow-kmp-alert/40",
  },
};
