"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Idioma } from "@/lib/portal/i18n";
import { trocarIdiomaDoPortal } from "../actions";

/** PT | EN no canto direito do portal. */
export function IdiomaToggle({ idioma, rotulo }: { idioma: Idioma; rotulo: string }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <div role="group" aria-label={rotulo} className="flex h-10 items-center rounded-full bg-kmp-surface p-1 shadow-sm">
      {(["pt", "en"] as const).map((op) => (
        <button
          key={op}
          type="button"
          disabled={pendente}
          aria-pressed={idioma === op}
          onClick={() =>
            iniciar(async () => {
              await trocarIdiomaDoPortal(op);
              router.refresh();
            })
          }
          className={`h-8 rounded-full px-3 text-xs font-bold uppercase transition ${
            idioma === op ? "bg-kmp-primary text-kmp-on-primary" : "text-kmp-text/70 hover:text-kmp-text"
          }`}
        >
          {op}
        </button>
      ))}
    </div>
  );
}
