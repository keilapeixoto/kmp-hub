import Link from "next/link";
import { Bell } from "lucide-react";
import { MenuSuspenso } from "@/components/ui/menu-suspenso";
import type { GrupoDeNotificacoes } from "@/lib/notificacoes";
import { SUAVE, type CorViva } from "@/components/ui/vivid";

/** Borda colorida de cada grupo (mesma cor do módulo). */
const BORDA: Record<CorViva, string> = {
  azul: "border-[#5f92f2]",
  turquesa: "border-[#45b4c5]",
  lilas: "border-[#9184f2]",
  verde: "border-[#45c285]",
  amarelo: "border-[#f0c040]",
  rosa: "border-[#e8679a]",
  roxo: "border-[#bd72ae]",
  laranja: "border-kmp-orange",
  vermelho: "border-[#e5484d]",
  cinza: "border-[#a3a6ad]",
};

/** Sino do cabeçalho: número do que pede atenção e um painel com os atalhos. */
export function SinoNotificacoes({ grupos, botaoClassName }: { grupos: GrupoDeNotificacoes[]; botaoClassName: string }) {
  const total = grupos.reduce((n, g) => n + g.total, 0);
  const temVencido = grupos.some((g) => g.chave === "vistos");
  return (
    <MenuSuspenso
      className="relative"
      ariaLabel={total ? `Notificações: ${total}` : "Notificações"}
      summaryClassName={`${botaoClassName} relative`}
      summary={
        <>
          <Bell className="h-4 w-4" />
          {total > 0 ? (
            <span
              className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                temVencido ? "bg-[#e5484d]" : "bg-kmp-orange"
              }`}
            >
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
              <section key={g.chave} className={`border-l-4 pl-2 ${BORDA[g.cor]}`}>
                <div className={`mb-1 flex items-center justify-between rounded-xl px-2 py-1 ${SUAVE[g.cor]}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{g.titulo}</p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold dark:bg-black/20">{g.total}</span>
                </div>
                <ul>
                  {g.itens.map((n) => (
                    <li key={n.id}>
                      <Link href={n.href} className="flex items-baseline justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-kmp-text/5">
                        <span className="min-w-0 truncate text-kmp-text">{n.titulo}</span>
                        {n.detalhe ? (
                          <span
                            className={`shrink-0 truncate text-xs ${g.chave === "vistos" ? "font-semibold text-[#c2343f]" : "text-kmp-text/60"}`}
                          >
                            {n.detalhe}
                          </span>
                        ) : null}
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
