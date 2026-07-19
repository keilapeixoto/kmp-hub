"use client";

import { useActionState } from "react";
import { convertLead, type ConvertLeadState } from "../actions";

const initialState: ConvertLeadState = { error: null };

export function ConvertLeadButton({ leadId }: { leadId: string }) {
  const convertLeadWithId = convertLead.bind(null, leadId);
  const [state, formAction, pending] = useActionState(
    convertLeadWithId,
    initialState,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Convertendo…" : "Converter em cliente"}
      </button>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
