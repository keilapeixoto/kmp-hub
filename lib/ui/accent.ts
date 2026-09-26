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

export const ACCENT_STYLES: Record<
  Accent,
  { tile: string; activeRow: string }
> = {
  brand: {
    tile: "bg-gradient-to-br from-kmp-orange to-kmp-orange-deep text-white shadow-sm shadow-kmp-orange/40",
    activeRow: "bg-kmp-orange/10 text-kmp-orange-deep",
  },
  leads: {
    tile: "bg-gradient-to-br from-kmp-leads to-kmp-leads-deep text-white shadow-sm shadow-kmp-leads/40",
    activeRow: "bg-kmp-leads/10 text-kmp-leads-deep",
  },
  clientes: {
    tile: "bg-gradient-to-br from-kmp-clientes to-kmp-clientes-deep text-white shadow-sm shadow-kmp-clientes/40",
    activeRow: "bg-kmp-clientes/10 text-kmp-clientes-deep",
  },
  processos: {
    tile: "bg-gradient-to-br from-kmp-processos to-kmp-processos-deep text-white shadow-sm shadow-kmp-processos/40",
    activeRow: "bg-kmp-processos/10 text-kmp-processos-deep",
  },
  agenda: {
    tile: "bg-gradient-to-br from-kmp-agenda to-kmp-agenda-deep text-white shadow-sm shadow-kmp-agenda/40",
    activeRow: "bg-kmp-agenda/10 text-kmp-agenda-deep",
  },
  documentos: {
    tile: "bg-gradient-to-br from-kmp-documentos to-kmp-documentos-deep text-white shadow-sm shadow-kmp-documentos/40",
    activeRow: "bg-kmp-documentos/10 text-kmp-documentos-deep",
  },
  config: {
    tile: "bg-gradient-to-br from-kmp-config to-kmp-config-deep text-white shadow-sm shadow-kmp-config/40",
    activeRow: "bg-kmp-config/10 text-kmp-config-deep",
  },
  finance: {
    tile: "bg-gradient-to-br from-kmp-finance to-kmp-finance-deep text-white shadow-sm shadow-kmp-finance/40",
    activeRow: "bg-kmp-finance/10 text-kmp-finance-deep",
  },
  alert: {
    tile: "bg-gradient-to-br from-kmp-alert to-kmp-alert-deep text-white shadow-sm shadow-kmp-alert/40",
    activeRow: "bg-kmp-alert/10 text-kmp-alert-deep",
  },
};
