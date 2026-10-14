"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS, isActive, type NavItem } from "./sidebar";
import { MenuSuspenso } from "@/components/ui/menu-suspenso";

// Menu de abas em pílula no topo (redesign âmbar, out/2026): as abas do dia
// a dia ficam à vista; Biblioteca e Configurações ficam em "Mais".
// Abas na barra. As "extras" só aparecem com tela larga (xl); em telas
// estreitas ou com zoom vão para "Mais", para a barra não cortar nem rolar.
const PRINCIPAIS = [
  "/inicio",
  "/processos?view=kanban",
  "/dashboard",
  "/leads",
  "/clientes",
  "/processos",
  "/vencimentos",
  "/financeiro",
  "/tarefas",
  "/agenda",
];
const EXTRAS = ["/dashboard", "/vencimentos", "/financeiro"];

const todos = NAV_GROUPS.flatMap((g) => g.items);
const principais = PRINCIPAIS.map((href) => todos.find((i) => i.href === href)).filter(
  (i): i is NavItem => Boolean(i),
);
const gruposMais = NAV_GROUPS.map((g) => ({
  label: g.label,
  items: g.items.filter((i) => !PRINCIPAIS.includes(i.href)),
})).filter((g) => g.items.length > 0);

const pilula = "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition 2xl:px-3.5";
const ativa = "bg-kmp-primary text-kmp-on-primary shadow-sm";
const inativa = "text-kmp-text/75 hover:bg-kmp-text/5 hover:text-kmp-text";

export function TopNav() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  const ativo = (i: NavItem) => isActive(pathname, view, i.href, i.exact);
  const maisAtivo = gruposMais.some((g) => g.items.some(ativo));

  return (
    <div className="flex min-w-0 items-center gap-1 rounded-full bg-kmp-surface p-1 shadow-sm">
      <nav className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto">
        {principais.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${pilula} ${ativo(item) ? ativa : inativa} ${EXTRAS.includes(item.href) ? "hidden xl:block" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <MenuSuspenso
        className="relative shrink-0"
        summaryClassName={`${pilula} flex items-center gap-1 ${maisAtivo ? ativa : inativa}`}
        summary={
          <>
            Mais <ChevronDown className="h-3.5 w-3.5" />
          </>
        }
      >
        {/* Abas extras aparecem aqui só quando não cabem na barra. */}
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-kmp-panel dark:ring-white/10">
          <div className="xl:hidden">
            {principais
              .filter((i) => EXTRAS.includes(i.href))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium ${ativo(item) ? ativa : inativa}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
          </div>
          {gruposMais.map((g) => (
            <div key={g.label ?? "geral"} className="py-1">
              {g.label ? (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-kmp-text/50">{g.label}</p>
              ) : null}
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium ${ativo(item) ? ativa : inativa}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </MenuSuspenso>
    </div>
  );
}
