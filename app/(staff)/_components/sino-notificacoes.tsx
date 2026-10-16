import Link from "next/link";
import { Bell } from "lucide-react";
import { MenuSuspenso } from "@/components/ui/menu-suspenso";
import type { GrupoDeNotificacoes } from "@/lib/notificacoes";

/** Sino do cabeçalho: número do que pede atenção e um painel com os atalhos. */
export function SinoNotificacoes({ grupos, botaoClassName }: { grupos: GrupoDeNotificacoes[]; botaoClassName: string }) {
  const total = grupos.reduce((n, g) => n + g.total, 0);
  return (
    <MenuSuspenso
      className="relative"
      ariaLabel={total ? `Notificações: ${total}` : "Notificações"}
      summaryClassName={`${botaoClassName} relative`}
      summary={
        <>
          <Bell className="h-4 w-4" />
          {total > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kmp-orange px-1 text-[10px] font-bold text-white">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </>
      }
    >
      <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[22rem] overflow-y-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5 dark:bg-kmp-panel dark:ring-white/10">
        {grupos.length === 0 ? (
          <p className="p-3 text-sm text-kmp-text/70">Nada pedindo sua atenção agora.</p>
        ) : (
          <div className="space-y-3">
            {grupos.map((g) => (
              <section key={g.chave}>
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-kmp-text/60">{g.titulo}</p>
                  <span className="rounded-full bg-kmp-text/10 px-2 py-0.5 text-xs font-semibold text-kmp-text/70">{g.total}</span>
                </div>
                <ul>
                  {g.itens.map((n) => (
                    <li key={n.id}>
                      <Link href={n.href} className="flex items-baseline justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-kmp-text/5">
                        <span className="min-w-0 truncate text-kmp-text">{n.titulo}</span>
                        {n.detalhe ? <span className="shrink-0 truncate text-xs text-kmp-text/60">{n.detalhe}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.total > g.itens.length ? (
                  <Link href={g.verTudo} className="block px-2 pt-1 text-xs font-semibold text-kmp-text/70 hover:text-kmp-text">
                    Ver todos ({g.total})
                  </Link>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </MenuSuspenso>
  );
}
