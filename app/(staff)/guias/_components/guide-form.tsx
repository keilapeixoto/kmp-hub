"use client";

import { useActionState } from "react";
import type { Guide } from "@/lib/guides/data";
import type { ServiceType } from "@/lib/cases/types";
import type { GuideFormState } from "../actions";

const initialState: GuideFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function GuideForm({
  action,
  guide,
  serviceTypes,
}: {
  action: (prevState: GuideFormState, formData: FormData) => Promise<GuideFormState>;
  guide?: Guide;
  serviceTypes: ServiceType[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="titulo" className="block text-sm font-medium text-kmp-graphite">
          Título *
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={guide?.titulo ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="service_type_id"
          className="block text-sm font-medium text-kmp-graphite"
        >
          Tipo de serviço (opcional)
        </label>
        <select
          id="service_type_id"
          name="service_type_id"
          defaultValue={guide?.service_type_id ?? ""}
          className={inputClass}
        >
          <option value="">Nenhum — guia geral</option>
          {serviceTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="conteudo" className="block text-sm font-medium text-kmp-graphite">
          Conteúdo *
        </label>
        <textarea
          id="conteudo"
          name="conteudo"
          rows={16}
          required
          defaultValue={guide?.conteudo ?? ""}
          className={`${inputClass} font-mono text-xs`}
        />
        <p className="mt-1 text-xs text-kmp-graphite/50">
          Cada salvamento com conteúdo alterado gera uma nova versão
          automaticamente — o histórico fica ao lado.
        </p>
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
