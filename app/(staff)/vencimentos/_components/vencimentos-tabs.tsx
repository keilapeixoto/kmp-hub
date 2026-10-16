"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/vencimentos", label: "Vistos" },
  { href: "/vencimentos/aplicacoes", label: "Aplicações" },
  { href: "/vencimentos/prazos", label: "Prazos de 28 dias" },
];

export function VencimentosTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-kmp-primary text-kmp-on-primary shadow-sm"
                : "bg-kmp-surface text-kmp-text/70 shadow-sm hover:text-kmp-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
