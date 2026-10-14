import { Suspense } from "react";
import Link from "next/link";
import { Bell, LogOut, Settings } from "lucide-react";
import { logout } from "../actions";
import { GlobalSearchInput } from "./global-search-input";
import { ThemeToggle } from "./theme-toggle";
import { TopNav } from "./top-nav";

const redondo =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kmp-surface text-kmp-text/80 shadow-sm transition hover:text-kmp-text";

// Cabeçalho do redesign âmbar (out/2026): marca em pílula, abas no meio e
// ações em botões redondos — sem menu lateral.
export function HeaderBar({ userEmail }: { userEmail: string }) {
  const inicial = (userEmail[0] ?? "K").toUpperCase();
  return (
    <header className="relative z-40 mx-auto w-full max-w-[1600px] px-6 pt-5 lg:px-10">
      <div className="flex items-center gap-3">
        {/* Marca: logo KMP | HUB (grosso) com CRM laranja embaixo. */}
        <Link href="/inicio" aria-label="KMP Hub CRM — início" className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local fixo, sem otimização */}
          <img src="/kmp-logo-mark.svg" alt="KMP" className="h-9 w-auto" />
          <span aria-hidden="true" className="h-8 w-px bg-kmp-text/25" />
          <span className="flex flex-col items-end font-wordmark leading-none">
            <span className="text-[22px] font-extrabold tracking-tight text-kmp-text">HUB</span>
            <span className="mt-0.5 mr-[-0.28em] text-[10.5px] font-semibold tracking-[0.28em] text-kmp-orange">
              CRM
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <Suspense fallback={null}>
            <TopNav />
          </Suspense>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/configuracoes" aria-label="Configurações" className={redondo}>
            <Settings className="h-4 w-4" />
          </Link>
          <button type="button" aria-label="Notificações (em breve)" className={redondo}>
            <Bell className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <Link
            href="/perfil"
            title={userEmail}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-kmp-primary text-sm font-semibold text-kmp-on-primary"
          >
            {inicial}
          </Link>
          <form action={logout}>
            <button type="submit" aria-label="Sair" className={redondo}>
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <div className="mt-4 max-w-md">
        <GlobalSearchInput />
      </div>
    </header>
  );
}
