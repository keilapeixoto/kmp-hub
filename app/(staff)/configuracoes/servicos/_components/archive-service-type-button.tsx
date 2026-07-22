"use client";

import { useTransition } from "react";
import { archiveServiceType, reactivateServiceType } from "../actions";

export function ArchiveServiceTypeButton({
  id,
  arquivado,
}: {
  id: string;
  arquivado: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (arquivado) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => reactivateServiceType(id))}
        className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange disabled:opacity-60"
      >
        {pending ? "…" : "Reativar pipeline"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Arquivar esta pipeline? Ela deixa de aparecer na lista e no \"novo processo\", mas processos que já usam ela continuam funcionando normalmente.",
          )
        ) {
          return;
        }
        startTransition(() => archiveServiceType(id));
      }}
      className="text-sm text-kmp-graphite/70 transition hover:text-red-600 disabled:opacity-60"
    >
      {pending ? "Arquivando…" : "Arquivar pipeline"}
    </button>
  );
}
