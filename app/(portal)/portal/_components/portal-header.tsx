import Link from "next/link";
import { LogOut } from "lucide-react";
import { portalLogout } from "../actions";
import { PortalBrand } from "./portal-brand";
import { PortalNav } from "./portal-nav";
import { IdiomaToggle } from "./idioma-toggle";
import { tradutor, type Idioma } from "@/lib/portal/i18n";

export function PortalHeader({ idioma = "pt" }: { idioma?: Idioma }) {
  const t = tradutor(idioma);
  return (
    <header className="relative z-40 mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/portal" aria-label={t("nav.inicio")}>
          <PortalBrand />
        </Link>
        <div className="order-3 w-full sm:order-2 sm:w-auto">
          <PortalNav
            abas={[
              { href: "/portal", label: t("nav.processo") },
              { href: "/portal/documentos", label: t("nav.documentos") },
              { href: "/portal/linha-do-tempo", label: t("nav.linha") },
            ]}
          />
        </div>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <IdiomaToggle idioma={idioma} rotulo={t("nav.idioma")} />
          <form action={portalLogout}>
            <button
              type="submit"
              aria-label={t("nav.sair")}
              className="flex h-10 items-center gap-2 rounded-full bg-kmp-surface px-4 text-sm font-semibold text-kmp-text/80 shadow-sm transition hover:text-kmp-text"
            >
              <LogOut className="h-4 w-4" /> {t("nav.sair")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
