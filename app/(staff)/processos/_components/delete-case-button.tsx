"use client";

import { useTransition } from "react";
import { deleteCase } from "../actions";

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Excluir este processo definitivamente? Essa ação não pode ser desfeita.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          await deleteCase(caseId);
        });
      }}
      className="text-sm text-red-600 transition hover:underline disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir processo"}
    </button>
  );
}
