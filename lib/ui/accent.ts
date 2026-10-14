// Redesign âmbar (out/2026): ícone em círculo de tom suave da cor do módulo e
// aba ativa em pílula grafite (antes: quadrado com gradiente saturado).
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
    tile: "bg-kmp-orange/15 text-kmp-orange-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  leads: {
    tile: "bg-kmp-leads/15 text-kmp-leads-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  clientes: {
    tile: "bg-kmp-clientes/15 text-kmp-clientes-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  processos: {
    tile: "bg-kmp-processos/15 text-kmp-processos-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  agenda: {
    tile: "bg-kmp-agenda/15 text-kmp-agenda-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  documentos: {
    tile: "bg-kmp-documentos/15 text-kmp-documentos-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  config: {
    tile: "bg-kmp-config/15 text-kmp-config-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  finance: {
    tile: "bg-kmp-finance/15 text-kmp-finance-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
  alert: {
    tile: "bg-kmp-alert/15 text-kmp-alert-deep",
    activeRow: "bg-kmp-primary text-kmp-on-primary shadow-sm",
  },
};
