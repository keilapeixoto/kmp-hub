"use client";

import { useActionState } from "react";
import { requestPortalMagicLink } from "../actions";

export function PortalLoginForm({
  textos,
}: {
  textos: { email: string; placeholder: string; enviar: string; enviando: string; enviado: string };
}) {
  const [state, formAction, pending] = useActionState(requestPortalMagicLink, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return (
      <p className="mt-6 rounded-2xl bg-[#dcf3e7] p-4 text-center text-sm text-[#16673f]">
        {textos.enviado}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-kmp-text"
        >
          {textos.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={textos.placeholder}
          className="mt-1.5 w-full rounded-xl border border-kmp-text/15 bg-white/85 px-3.5 py-2.5 text-sm text-kmp-text outline-none focus:border-kmp-orange focus:ring-2 focus:ring-kmp-orange/20"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-kmp-primary px-4 py-2.5 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? textos.enviando : textos.enviar}
      </button>
      {state.error ? (
        <p className="text-sm text-[#b0283b]">{state.error}</p>
      ) : null}
    </form>
  );
}
