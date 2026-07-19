import Link from "next/link";
import { LEAD_STATUSES } from "@/lib/leads/constants";
import type { ConsultantOption, LeadFilters } from "@/lib/leads/types";

const selectClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

export function LeadsFilters({
  filters,
  view,
  consultants,
  origens,
  servicos,
  paises,
}: {
  filters: LeadFilters;
  view: string;
  consultants: ConsultantOption[];
  origens: string[];
  servicos: string[];
  paises: string[];
}) {
  return (
    <form
      method="GET"
      className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-7"
    >
      <input type="hidden" name="view" value={view} />

      {consultants.length > 0 ? (
        <div>
          <label className={labelClass}>Consultor</label>
          <select
            name="consultor"
            defaultValue={filters.consultor ?? ""}
            className={selectClass}
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
        <label className={labelClass}>Serviço</label>
        <select
          name="servico"
          defaultValue={filters.servico ?? ""}
          className={selectClass}
        >
          <option value="">Todos</option>
          {servicos.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Origem</label>
        <select
          name="origem"
          defaultValue={filters.origem ?? ""}
          className={selectClass}
        >
          <option value="">Todas</option>
          {origens.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>País</label>
        <select
          name="pais"
          defaultValue={filters.pais ?? ""}
          className={selectClass}
        >
          <option value="">Todos</option>
          {paises.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Status</label>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={selectClass}
        >
          <option value="">Todos</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>De</label>
        <input
          type="date"
          name="de"
          defaultValue={filters.de ?? ""}
          className={selectClass}
        />
      </div>

      <div>
        <label className={labelClass}>Até</label>
        <input
          type="date"
          name="ate"
          defaultValue={filters.ate ?? ""}
          className={selectClass}
        />
      </div>

      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-7">
        <button
          type="submit"
          className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href={`/leads?view=${view}`}
          className="rounded-md px-4 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
