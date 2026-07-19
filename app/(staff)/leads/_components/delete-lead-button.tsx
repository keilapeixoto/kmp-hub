"use client";

import { useTransition } from "react";
import { deleteLead } from "../actions";

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Excluir este lead definitivamente? Essa ação não pode ser desfeita.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await deleteLead(leadId);
        });
      }}
      className="text-sm text-red-600 transition hover:underline disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir lead"}
    </button>
  );
}
