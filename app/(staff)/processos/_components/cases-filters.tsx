import Link from "next/link";
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/cases/constants";
import type { ServiceType } from "@/lib/cases/types";
import type { CaseFilters } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

export function CasesFilters({
  filters,
  view,
  consultants,
  serviceTypes,
}: {
  filters: CaseFilters;
  view: string;
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
}) {
  return (
    <form
      method="GET"
      className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4"
    >
      <input type="hidden" name="view" value={view} />

      {consultants.length > 0 ? (
        <div>
          <label className={labelClass}>Consultor</label>
          <select
            name="consultor"
            defaultValue={filters.consultor ?? ""}
            className={inputClass}
          >
            <option value="">Todos</option>
            {consultants.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Tipo de serviço</label>
        <select
          name="servicoTipo"
          defaultValue={filters.servicoTipo ?? ""}
          className={inputClass}
        >
          <option value="">Todos</option>
          {serviceTypes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Status</label>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={inputClass}
        >
          <option value="">Todos</option>
          {CASE_STATUSES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Prioridade</label>
        <select
          name="prioridade"
          defaultValue={filters.prioridade ?? ""}
          className={inputClass}
        >
          <option value="">Todas</option>
          {CASE_PRIORITIES.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href={`/processos?view=${view}`}
          className="rounded-md px-4 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
