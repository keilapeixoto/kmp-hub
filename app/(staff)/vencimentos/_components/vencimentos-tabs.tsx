"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/vencimentos", label: "Vistos" },
  { href: "/vencimentos/prazos", label: "Prazos de 28 dias" },
];

export function VencimentosTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-black/10">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-b-2 border-kmp-orange text-kmp-graphite"
                : "text-kmp-graphite/60 hover:text-kmp-orange"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
