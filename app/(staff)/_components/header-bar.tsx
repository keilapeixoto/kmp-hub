import Link from "next/link";
import { Bell } from "lucide-react";
import { logout } from "../actions";
import { GlobalSearchInput } from "./global-search-input";

export function HeaderBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4">
      <GlobalSearchInput />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificações (em breve)"
          className="rounded-md p-2 text-kmp-graphite/60 transition hover:bg-black/5 hover:text-kmp-orange"
        >
          <Bell className="h-5 w-5" />
        </button>
        <Link
          href="/perfil"
          className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          {userEmail}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
