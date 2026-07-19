import { Bell, Search } from "lucide-react";
import { logout } from "../actions";

export function HeaderBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4">
      <form action="/busca" method="GET" className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kmp-graphite/40" />
        <input
          type="search"
          name="q"
          placeholder="Buscar leads, clientes, tarefas, guias…"
          aria-label="Busca global"
          className="w-full rounded-md border border-black/10 py-2 pl-9 pr-3 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
      </form>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificações (em breve)"
          className="rounded-md p-2 text-kmp-graphite/60 transition hover:bg-black/5 hover:text-kmp-orange"
        >
          <Bell className="h-5 w-5" />
        </button>
        <span className="text-sm text-kmp-graphite/70">{userEmail}</span>
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
