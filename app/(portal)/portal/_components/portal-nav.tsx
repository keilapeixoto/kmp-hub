"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalNav({ abas }: { abas: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full bg-kmp-surface p-1 shadow-sm">
      {abas.map((a) => {
        const ativa = a.href === "/portal" ? pathname === "/portal" || pathname.startsWith("/portal/formulario") : pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              ativa ? "bg-kmp-primary text-kmp-on-primary shadow-sm" : "text-kmp-text/75 hover:text-kmp-text"
            }`}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
