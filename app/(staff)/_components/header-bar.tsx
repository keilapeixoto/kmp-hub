import Link from "next/link";
import { Bell } from "lucide-react";
import { logout } from "../actions";
import { GlobalSearchInput } from "./global-search-input";

export function HeaderBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between gap-4 bg-gradient-to-r from-kmp-graphite via-kmp-graphite to-kmp-orange-deep px-6 py-4 shadow-sm">
      <GlobalSearchInput />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificações (em breve)"
          className="rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-kmp-orange"
        >
          <Bell className="h-5 w-5" />
        </button>
        <Link
          href="/perfil"
          className="text-sm text-white/80 transition hover:text-kmp-orange"
        >
          {userEmail}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-white/80 transition hover:text-kmp-orange"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
