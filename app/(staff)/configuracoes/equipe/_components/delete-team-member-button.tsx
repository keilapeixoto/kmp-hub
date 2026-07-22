"use client";

import { useTransition } from "react";
import { deleteTeamMember } from "../actions";

export function DeleteTeamMemberButton({
  userId,
  nome,
}: {
  userId: string;
  nome: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Remover ${nome} definitivamente? Essa ação não pode ser desfeita — a pessoa perde o acesso ao painel imediatamente.`,
          )
        ) {
          return;
        }
        startTransition(() => {
          deleteTeamMember(userId);
        });
      }}
      className="text-sm text-red-600 transition hover:underline disabled:opacity-60"
    >
      {pending ? "Removendo…" : "Remover usuário"}
    </button>
  );
}
