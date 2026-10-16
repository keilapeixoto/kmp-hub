"use client";

import { useActionState, useTransition } from "react";
import { inviteClientToPortal, removerAcessoAoPortal } from "../actions";
import type { AcessoAoPortal } from "@/lib/clients/portal-acesso";

export function PortalAccessCard({
  clientId,
  clientEmail,
  acessos,
  canInvite,
}: {
  clientId: string;
  clientEmail: string | null;
  acessos: AcessoAoPortal[];
  canInvite: boolean;
}) {
  const action = inviteClientToPortal.bind(null, clientId);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
  });
  const [removendo, iniciar] = useTransition();
  const emailCadastro = clientEmail?.toLowerCase() ?? null;

  return (
    <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
      <h2 className="font-heading text-lg text-kmp-text">
        Acesso ao portal
      </h2>

      {acessos.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {acessos.map((a) => (
            <li key={a.id} className="text-sm text-kmp-text">
              <p>
                Entra com <span className="font-medium">{a.email ?? "conta sem e-mail"}</span>
                <span className="text-kmp-text/60"> · {a.jaEntrou ? "já entrou" : "ainda não entrou"}</span>
              </p>
              {a.email && emailCadastro && a.email.toLowerCase() !== emailCadastro ? (
                <p className="mt-1 text-xs text-amber-700">
                  Esse login é diferente do e-mail do cadastro. Mudar o e-mail no perfil não muda quem entra no portal.
                </p>
              ) : null}
              {canInvite ? (
                <button
                  type="button"
                  disabled={removendo}
                  onClick={() => {
                    if (!confirm(`Tirar o acesso de ${a.email ?? "esta conta"} ao portal deste cliente?`)) return;
                    iniciar(async () => {
                      const r = await removerAcessoAoPortal(clientId, a.id);
                      if (r.error) alert(r.error);
                    });
                  }}
                  className="mt-1 text-xs font-medium text-red-700 hover:underline disabled:opacity-60"
                >
                  {removendo ? "Removendo…" : "Remover acesso"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : state.success ? (
        <p className="mt-4 text-sm text-kmp-text/70">
          Convite enviado para o e-mail do cadastro. O cliente entra pelo link, sem senha.
        </p>
      ) : !clientEmail ? (
        <p className="mt-4 text-sm text-kmp-text/50">
          Cadastre um e-mail para o cliente na aba &quot;Dados&quot; antes de
          convidar.
        </p>
      ) : !canInvite ? (
        <p className="mt-4 text-sm text-kmp-text/50">
          Só admin ou diretor pode enviar o convite.
        </p>
      ) : (
        <form action={formAction} className="mt-4">
          <p className="mb-3 text-sm text-kmp-text/50">
            Envia para {clientEmail} um e-mail com link de acesso direto ao portal — o cliente
            passa a ver o processo dele e enviar documentos sozinho.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
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
