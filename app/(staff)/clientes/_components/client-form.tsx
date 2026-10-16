"use client";

import { useActionState } from "react";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import type { ClientFormState } from "../actions";

const initialState: ClientFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-text";

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
        <h2 className="font-heading text-lg text-kmp-text">
          Dados pessoais
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nomes" className={labelClass}>
              Nome(s) *
            </label>
            <input
              id="nomes"
              name="nomes"
              required
              placeholder="Como no passaporte (Given names)"
              defaultValue={client?.nomes ?? (client?.sobrenome ? "" : (client?.nome ?? ""))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sobrenome" className={labelClass}>
              Sobrenome
            </label>
            <input
              id="sobrenome"
              name="sobrenome"
              placeholder="Como no passaporte (Family name)"
              defaultValue={client?.sobrenome ?? ""}
              className={inputClass}
            />
            {client && !client.nomes && !client.sobrenome ? (
              <p className="mt-1 text-xs text-amber-700">
                Cadastro antigo: o nome completo está em &quot;Nome(s)&quot;. Separe o sobrenome e salve.
              </p>
            ) : null}
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
        <h2 className="font-heading text-lg text-kmp-text">Contato</h2>
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
        <h2 className="font-heading text-lg text-kmp-text">
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
        <h2 className="font-heading text-lg text-kmp-text">Endereços</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="endereco_origem" className={labelClass}>
              Endereço no país de origem
            </label>
            <textarea
              id="endereco_origem"
              name="endereco_origem"
              rows={3}
              placeholder="Rua, número, complemento, cidade, estado, CEP"
              defaultValue={client?.endereco_origem ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="endereco_australia" className={labelClass}>
              Endereço na Austrália
            </label>
            <textarea
              id="endereco_australia"
              name="endereco_australia"
              rows={3}
              placeholder="Street, suburb, state, postcode"
              defaultValue={client?.endereco_australia ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-text">
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
                className={`${inputClass} bg-kmp-divider text-kmp-text/60`}
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

      <section>
        <h2 className="font-heading text-lg text-kmp-text">
          Visto atual
        </h2>
        <p className="mt-1 text-xs text-kmp-text/50">
          O visto que o cliente já possui e está usando agora — não é o
          processo em andamento. Alimenta o painel de{" "}
          <a href="/vencimentos" className="underline hover:text-kmp-orange">
            Vencimentos
          </a>
          .
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="visto_aplicado" className={labelClass}>
              Visto aplicado / a aplicar
            </label>
            <input
              id="visto_aplicado"
              name="visto_aplicado"
              placeholder="ex.: 485 · aplicado"
              defaultValue={client?.visto_aplicado ?? ""}
              className={inputClass}
            />
            {client?.visto_aplicado_origem ? (
              <p className="mt-1 text-xs text-kmp-text/60">Veio de: {client.visto_aplicado_origem}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="visto_atual_subclasse" className={labelClass}>
              Subclasse
            </label>
            <input
              id="visto_atual_subclasse"
              name="visto_atual_subclasse"
              placeholder="ex.: 500"
              defaultValue={client?.visto_atual_subclasse ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="visto_atual_validade" className={labelClass}>
              Vencimento
            </label>
            <input
              id="visto_atual_validade"
              name="visto_atual_validade"
              type="date"
              defaultValue={client?.visto_atual_validade ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="visto_alerta_limite_dias" className={labelClass}>
              Limite de alerta crítico (dias)
            </label>
            <input
              id="visto_alerta_limite_dias"
              name="visto_alerta_limite_dias"
              type="number"
              min={0}
              placeholder="Padrão: 30"
              defaultValue={client?.visto_alerta_limite_dias ?? ""}
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
        className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
