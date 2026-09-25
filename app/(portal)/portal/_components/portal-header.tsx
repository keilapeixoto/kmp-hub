import Link from "next/link";
import { portalLogout } from "../actions";

export function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-4">
      <span className="font-heading text-xl text-kmp-graphite">KMP Hub</span>
      <nav className="flex items-center gap-4">
        <Link
          href="/portal/ocupacoes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          Ocupações
        </Link>
        <form action={portalLogout}>
          <button
            type="submit"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}
