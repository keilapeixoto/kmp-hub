"use client";

import { useActionState, useRef } from "react";
import { sendClientEmail, type SendEmailState } from "../actions";
import { GmailLogo } from "@/app/(staff)/_components/brand-icons";

const initialState: SendEmailState = { error: null, sent: false };

export function SendEmailPanel({ clientEmail }: { clientEmail: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: SendEmailState, formData: FormData) => {
      const result = await sendClientEmail(prev, formData);
      if (result.sent) formRef.current?.reset();
      return result;
    },
    initialState,
  );

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-lg text-kmp-graphite">
        <GmailLogo className="h-4 w-4" />
        Enviar e-mail
      </h2>
      <p className="mt-1 text-xs text-kmp-graphite/50">
        Vai pelo seu Gmail conectado — aparece na sua caixa de Enviados, pra{" "}
        {clientEmail}.
      </p>
      <form ref={formRef} action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="to" value={clientEmail} />
        <input
          type="text"
          name="subject"
          required
          placeholder="Assunto"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
        <textarea
          name="body"
          required
          rows={5}
          placeholder="Mensagem"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-kmp-primary px-4 py-1.5 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
          {state.error ? (
            <span className="ml-3 text-sm text-red-500">{state.error}</span>
          ) : null}
          {state.sent ? (
            <span className="ml-3 text-sm text-green-600">E-mail enviado.</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
