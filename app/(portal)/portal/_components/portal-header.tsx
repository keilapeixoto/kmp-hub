import Link from "next/link";
import { LogOut } from "lucide-react";
import { portalLogout } from "../actions";
import { PortalBrand } from "./portal-brand";
import { PortalNav } from "./portal-nav";

export function PortalHeader() {
  return (
    <header className="relative z-40 mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/portal" aria-label="Portal do cliente — início">
          <PortalBrand />
        </Link>
        <div className="order-3 w-full sm:order-2 sm:w-auto">
          <PortalNav />
        </div>
        <form action={portalLogout} className="order-2 sm:order-3">
          <button
            type="submit"
            aria-label="Sair"
            className="flex h-10 items-center gap-2 rounded-full bg-kmp-surface px-4 text-sm font-semibold text-kmp-text/80 shadow-sm transition hover:text-kmp-text"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </header>
  );
}
