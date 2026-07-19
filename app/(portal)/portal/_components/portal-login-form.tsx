"use client";

import { useActionState } from "react";
import { requestPortalMagicLink } from "../actions";

export function PortalLoginForm() {
  const [state, formAction, pending] = useActionState(requestPortalMagicLink, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return (
      <p className="mt-6 text-center text-sm text-kmp-graphite/70">
        Enviamos um link de acesso para o seu e-mail. Abra a mensagem e clique
        no link para entrar — sem senha.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-kmp-graphite"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar link de acesso"}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
