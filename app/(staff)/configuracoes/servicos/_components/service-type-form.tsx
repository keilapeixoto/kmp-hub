"use client";

import { useActionState } from "react";
import type { ServiceType } from "@/lib/cases/types";
import type { ServiceTypeFormState } from "../actions";

const initialState: ServiceTypeFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function ServiceTypeForm({
  action,
  serviceType,
}: {
  action: (
    prevState: ServiceTypeFormState,
    formData: FormData,
  ) => Promise<ServiceTypeFormState>;
  serviceType?: ServiceType;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-kmp-graphite">
          Nome *
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={serviceType?.nome ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="descricao"
          className="block text-sm font-medium text-kmp-graphite"
        >
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={serviceType?.descricao ?? ""}
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
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
