"use client";

import { useActionState, useMemo, useState } from "react";
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/cases/constants";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";
import type { TeamMember } from "@/lib/cases/data";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import type { CaseFormState } from "../actions";

const initialState: CaseFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export function CaseForm({
  action,
  caseItem,
  clients,
  serviceTypes,
  stagesByServiceType,
  consultants,
  teamMembers,
  canAssignConsultant,
  currentUserNome,
  lockedClientId,
}: {
  action: (prevState: CaseFormState, formData: FormData) => Promise<CaseFormState>;
  caseItem?: Case;
  clients: Client[];
  serviceTypes: ServiceType[];
  stagesByServiceType: Record<string, CaseStage[]>;
  consultants: ConsultantOption[];
  teamMembers: TeamMember[];
  canAssignConsultant: boolean;
  currentUserNome: string;
  lockedClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [serviceTypeId, setServiceTypeId] = useState(
    caseItem?.service_type_id ?? "",
  );

  const stages = useMemo(
    () => stagesByServiceType[serviceTypeId] ?? [],
    [serviceTypeId, stagesByServiceType],
  );

  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Processo</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client_id" className={labelClass}>
              Cliente *
            </label>
            {lockedClientId ? (
              <input type="hidden" name="client_id" value={lockedClientId} />
            ) : null}
            <select
              id="client_id"
              name={lockedClientId ? undefined : "client_id"}
              required={!lockedClientId}
              disabled={Boolean(lockedClientId)}
              defaultValue={lockedClientId ?? caseItem?.client_id ?? ""}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="service_type_id" className={labelClass}>
              Tipo de serviço *
            </label>
            <select
              id="service_type_id"
              name="service_type_id"
              required
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {serviceTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="etapa_id" className={labelClass}>
              Etapa
            </label>
            <select
              id="etapa_id"
              name="etapa_id"
              defaultValue={caseItem?.etapa_id ?? ""}
              disabled={stages.length === 0}
              className={inputClass}
            >
              <option value="">
                {stages.length === 0 ? "Escolha um tipo de serviço primeiro" : "Sem etapa"}
              </option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ordem}. {s.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={caseItem?.status ?? "ativo"}
              className={inputClass}
            >
              {CASE_STATUSES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="prioridade" className={labelClass}>
              Prioridade
            </label>
            <select
              id="prioridade"
              name="prioridade"
              defaultValue={caseItem?.prioridade ?? "media"}
              className={inputClass}
            >
              {CASE_PRIORITIES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">Prazos</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inicio" className={labelClass}>
              Início
            </label>
            <input
              id="inicio"
              name="inicio"
              type="date"
              defaultValue={caseItem?.inicio ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="prazo" className={labelClass}>
              Prazo
            </label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              defaultValue={caseItem?.prazo ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg text-kmp-graphite">
          Responsáveis
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="consultor_id" className={labelClass}>
              Consultor responsável
            </label>
            {canAssignConsultant ? (
              <select
                id="consultor_id"
                name="consultor_id"
                defaultValue={caseItem?.consultor_id ?? ""}
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
            <label htmlFor="equipe" className={labelClass}>
              Equipe (segure Ctrl/Cmd para selecionar mais de um)
            </label>
            <select
              id="equipe"
              name="equipe"
              multiple
              defaultValue={caseItem?.equipe ?? []}
              className={`${inputClass} h-32`}
            >
              {teamMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.nome} ({m.role === "consultant" ? "consultor" : "operacional"})
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
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="proxima_acao" className={labelClass}>
              Próxima ação
            </label>
            <input
              id="proxima_acao"
              name="proxima_acao"
              defaultValue={caseItem?.proxima_acao ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="riscos" className={labelClass}>
              Riscos
            </label>
            <textarea
              id="riscos"
              name="riscos"
              rows={3}
              defaultValue={caseItem?.riscos ?? ""}
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
