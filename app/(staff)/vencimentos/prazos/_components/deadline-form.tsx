"use client";

import { useActionState, useRef } from "react";
import { REQUEST_TYPES } from "@/lib/case-deadlines/constants";
import type { ActiveCaseOption } from "@/lib/case-deadlines/types";
import { createCaseDeadline, type DeadlineFormState } from "../actions";

const initialState: DeadlineFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

const today = () => new Date().toISOString().slice(0, 10);

export function DeadlineForm({ cases }: { cases: ActiveCaseOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function action(prevState: DeadlineFormState, formData: FormData) {
    const result = await createCaseDeadline(prevState, formData);
    if (!result.error) formRef.current?.reset();
    return result;
  }

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-5"
    >
      <div className="sm:col-span-2">
        <label className={labelClass}>Processo</label>
        <select name="case_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Selecione
          </option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.client_nome} · {c.service_type_nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Tipo de pedido</label>
        <select name="tipo_pedido" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Selecione
          </option>
          {REQUEST_TYPES.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Data do pedido</label>
        <input
          type="date"
          name="data_pedido"
          required
          defaultValue={today()}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Prazo final (opcional)</label>
        <input type="date" name="prazo_final" className={inputClass} />
        <p className="mt-0.5 text-[11px] text-kmp-graphite/40">
          Em branco = data do pedido + 28 dias
        </p>
      </div>

      <div className="sm:col-span-5">
        <label className={labelClass}>Notas</label>
        <input type="text" name="notas" className={inputClass} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-5">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Criando…" : "Novo prazo de 28 dias"}
        </button>
      </div>
    </form>
  );
}
