"use client";

import { useActionState } from "react";
import type { CaseStatusLabel } from "@/lib/cases/types";
import { updateCaseStatusLabels } from "../actions";

const INITIAL_STATE = { error: null, saved: false };

export function StatusLabelsForm({ labels }: { labels: CaseStatusLabel[] }) {
  const [state, formAction, pending] = useActionState(
    updateCaseStatusLabels,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
      {labels.map((l) => (
        <div key={l.id}>
          <label
            htmlFor={`label_${l.status_slug}`}
            className="block text-sm font-medium text-kmp-graphite"
          >
            Coluna &quot;{l.status_slug}&quot;
          </label>
          <input
            id={`label_${l.status_slug}`}
            name={`label_${l.status_slug}`}
            defaultValue={l.label}
            required
            className="mt-1 w-full max-w-sm rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
          />
        </div>
      ))}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="text-sm text-green-700">Salvo.</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
