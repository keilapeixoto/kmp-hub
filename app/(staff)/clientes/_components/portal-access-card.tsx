"use client";

import { useActionState } from "react";
import { inviteClientToPortal } from "../actions";

export function PortalAccessCard({
  clientId,
  hasEmail,
  hasAccess,
  canInvite,
}: {
  clientId: string;
  hasEmail: boolean;
  hasAccess: boolean;
  canInvite: boolean;
}) {
  const action = inviteClientToPortal.bind(null, clientId);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="font-heading text-lg text-kmp-graphite">
        Acesso ao portal
      </h2>

      {hasAccess || state.success ? (
        <p className="mt-4 text-sm text-kmp-graphite/70">
          Este cliente já tem acesso ao portal — entra por link enviado ao
          e-mail cadastrado (magic link), sem senha.
        </p>
      ) : !hasEmail ? (
        <p className="mt-4 text-sm text-kmp-graphite/60">
          Cadastre um e-mail para o cliente na aba &quot;Dados&quot; antes de
          convidar.
        </p>
      ) : !canInvite ? (
        <p className="mt-4 text-sm text-kmp-graphite/60">
          Só admin ou diretor pode enviar o convite.
        </p>
      ) : (
        <form action={formAction} className="mt-4">
          <p className="mb-3 text-sm text-kmp-graphite/60">
            Envia um e-mail com link de acesso direto ao portal — o cliente
            passa a ver o processo dele e enviar documentos sozinho.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Convidar para o portal"}
          </button>
          {state.error ? (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
