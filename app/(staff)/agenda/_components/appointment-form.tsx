"use client";

import { useActionState } from "react";
import { AGENDA_TIMEZONES } from "@/lib/appointments/timezones";
import type { Client } from "@/lib/clients/types";
import type { Lead } from "@/lib/leads/types";
import type { AppointmentFormState } from "../actions";

const initialState: AppointmentFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export function AppointmentForm({
  action,
  clients,
  leads,
}: {
  action: (
    prevState: AppointmentFormState,
    formData: FormData,
  ) => Promise<AppointmentFormState>;
  clients: Client[];
  leads: Lead[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className={labelClass}>
            Título *
          </label>
          <input id="titulo" name="titulo" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="tipo" className={labelClass}>
            Tipo
          </label>
          <input
            id="tipo"
            name="tipo"
            placeholder="Consulta, follow-up, revisão…"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="fuso_entrada" className={labelClass}>
            Fuso do horário informado
          </label>
          <select
            id="fuso_entrada"
            name="fuso_entrada"
            defaultValue="Australia/Sydney"
            className={inputClass}
          >
            {AGENDA_TIMEZONES.map((z) => (
              <option key={z.tz} value={z.tz}>
                {z.label} ({z.tz})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inicio" className={labelClass}>
            Início *
          </label>
          <input
            id="inicio"
            name="inicio"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="fim" className={labelClass}>
            Fim
          </label>
          <input id="fim" name="fim" type="datetime-local" className={inputClass} />
        </div>

        <div>
          <label htmlFor="client_id" className={labelClass}>
            Cliente
          </label>
          <select id="client_id" name="client_id" defaultValue="" className={inputClass}>
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lead_id" className={labelClass}>
            Lead
          </label>
          <select id="lead_id" name="lead_id" defaultValue="" className={inputClass}>
            <option value="">Nenhum</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
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
