"use client";

import { useTransition } from "react";
import { archiveCase } from "../actions";

export function ArchiveCaseButton({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Arquivar este processo? Os documentos continuam acessíveis normalmente — arquivar não exclui nada.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await archiveCase(caseId);
        });
      }}
      className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange disabled:opacity-60"
    >
      {pending ? "Arquivando…" : "Arquivar processo"}
    </button>
  );
}
