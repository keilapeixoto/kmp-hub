"use client";

import { useActionState } from "react";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import type { ClientFormState } from "../actions";

const initialState: ClientFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export function ClientForm({
  action,
  client,
  consultants,
  canAssignConsultant,
  currentUserNome,
  distinctPaises,
  distinctSituacoes,
}: {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  consultants: ConsultantOption[];
  canAssignConsultant: boolean;
  currentUserNome: string;
  distinctPaises: string[];
  distinctSituacoes: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Dados pessoais
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nome" className={labelClass}>
              Nome *
            </label>
            <input
              id="nome"
              name="nome"
              required
              defaultValue={client?.nome ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="data_nascimento" className={labelClass}>
              Data de nascimento
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              defaultValue={client?.data_nascimento ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nacionalidade" className={labelClass}>
              Nacionalidade
            </label>
            <input
              id="nacionalidade"
              name="nacionalidade"
              defaultValue={client?.nacionalidade ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Contato</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefone" className={labelClass}>
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              defaultValue={client?.telefone ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              E mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="rede_social" className={labelClass}>
              Rede social
            </label>
            <input
              id="rede_social"
              name="rede_social"
              defaultValue={client?.rede_social ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Localização e idioma
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pais" className={labelClass}>
              País
            </label>
            <input
              id="pais"
              name="pais"
              list="clientes-paises-lista"
              defaultValue={client?.pais ?? ""}
              className={inputClass}
            />
            <datalist id="clientes-paises-lista">
              {distinctPaises.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="cidade" className={labelClass}>
              Cidade
            </label>
            <input
              id="cidade"
              name="cidade"
              defaultValue={client?.cidade ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fuso_horario" className={labelClass}>
              Fuso horário
            </label>
            <input
              id="fuso_horario"
              name="fuso_horario"
              placeholder="ex.: America/Sao_Paulo"
              defaultValue={client?.fuso_horario ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="idioma_preferencial" className={labelClass}>
              Idioma preferencial (portal)
            </label>
            <select
              id="idioma_preferencial"
              name="idioma_preferencial"
              defaultValue={client?.idioma_preferencial ?? "pt"}
              className={inputClass}
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Situação e objetivos
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="situacao" className={labelClass}>
              Situação
            </label>
            <input
              id="situacao"
              name="situacao"
              list="clientes-situacoes-lista"
              defaultValue={client?.situacao ?? ""}
              className={inputClass}
            />
            <datalist id="clientes-situacoes-lista">
              {distinctSituacoes.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="consultor_id" className={labelClass}>
              Consultor responsável
            </label>
            {canAssignConsultant ? (
              <select
                id="consultor_id"
                name="consultor_id"
                defaultValue={client?.consultor_id ?? ""}
                className={inputClass}
              >
                <option value="">Eu mesmo(a)</option>
                {consultants.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : (
              <input
                disabled
                value={currentUserNome}
                className={`${inputClass} bg-black/5 text-kmp-graphite/60`}
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="objetivos" className={labelClass}>
              Objetivos
            </label>
            <textarea
              id="objetivos"
              name="objetivos"
              rows={4}
              defaultValue={client?.objetivos ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

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
