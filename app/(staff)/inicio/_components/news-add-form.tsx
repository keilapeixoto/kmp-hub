"use client";

import { useActionState } from "react";
import { addImmigrationNews, type NewsFormState } from "../actions";

const initialState: NewsFormState = { error: null };

export function NewsAddForm() {
  const [state, formAction, pending] = useActionState(
    addImmigrationNews,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
      <input
        type="text"
        name="titulo"
        required
        placeholder="Título da novidade"
        className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange sm:col-span-2"
      />
      <input
        type="text"
        name="fonte"
        placeholder="Fonte (ex.: Home Affairs)"
        className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
      />
      <input
        type="url"
        name="link"
        placeholder="Link (opcional)"
        className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
      />
      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-kmp-primary px-4 py-1.5 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Publicando…" : "Publicar novidade"}
        </button>
        {state.error ? (
          <span className="ml-3 text-sm text-red-400">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
