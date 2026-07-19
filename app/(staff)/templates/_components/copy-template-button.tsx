"use client";

import { useState } from "react";

/** Copia o corpo do template — envio manual por cópia na Fase 1 (seção 6, item 13). */
export function CopyTemplateButton({ corpo }: { corpo: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(corpo);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-md bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
