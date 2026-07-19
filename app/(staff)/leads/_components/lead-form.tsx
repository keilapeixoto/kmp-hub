"use client";

import { useActionState } from "react";
import { LEAD_STATUSES } from "@/lib/leads/constants";
import type { ConsultantOption, Lead } from "@/lib/leads/types";
import type { LeadFormState } from "../actions";

const initialState: LeadFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export function LeadForm({
  action,
  lead,
  consultants,
  canAssignConsultant,
  currentUserNome,
  distinctOrigens,
  distinctServicos,
  distinctPaises,
}: {
  action: (prevState: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  lead?: Lead;
  consultants: ConsultantOption[];
  canAssignConsultant: boolean;
  currentUserNome: string;
  distinctOrigens: string[];
  distinctServicos: string[];
  distinctPaises: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Dados do lead
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
              defaultValue={lead?.nome ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="telefone" className={labelClass}>
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              defaultValue={lead?.telefone ?? ""}
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
              defaultValue={lead?.email ?? ""}
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
              defaultValue={lead?.rede_social ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Localização
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pais" className={labelClass}>
              País
            </label>
            <input
              id="pais"
              name="pais"
              list="paises-lista"
              defaultValue={lead?.pais ?? ""}
              className={inputClass}
            />
            <datalist id="paises-lista">
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
              defaultValue={lead?.cidade ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Comercial</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="origem" className={labelClass}>
              Origem
            </label>
            <input
              id="origem"
              name="origem"
              list="origens-lista"
              defaultValue={lead?.origem ?? ""}
              className={inputClass}
            />
            <datalist id="origens-lista">
              {distinctOrigens.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="servico_interesse" className={labelClass}>
              Serviço de interesse
            </label>
            <input
              id="servico_interesse"
              name="servico_interesse"
              list="servicos-lista"
              defaultValue={lead?.servico_interesse ?? ""}
              className={inputClass}
            />
            <datalist id="servicos-lista">
              {distinctServicos.map((valor) => (
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
                defaultValue={lead?.consultor_id ?? ""}
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
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={lead?.status ?? "novo"}
              className={inputClass}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Acompanhamento
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="proxima_acao" className={labelClass}>
              Próxima ação
            </label>
            <input
              id="proxima_acao"
              name="proxima_acao"
              defaultValue={lead?.proxima_acao ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="proxima_acao_data" className={labelClass}>
              Data da próxima ação
            </label>
            <input
              id="proxima_acao_data"
              name="proxima_acao_data"
              type="date"
              defaultValue={lead?.proxima_acao_data ?? ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="observacoes" className={labelClass}>
              Observações
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={4}
              defaultValue={lead?.observacoes ?? ""}
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
