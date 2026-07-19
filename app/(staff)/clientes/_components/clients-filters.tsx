import Link from "next/link";
import type { ConsultantOption } from "@/lib/leads/types";
import type { ClientFilters } from "@/lib/clients/types";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

export function ClientsFilters({
  filters,
  consultants,
  paises,
  situacoes,
}: {
  filters: ClientFilters;
  consultants: ConsultantOption[];
  paises: string[];
  situacoes: string[];
}) {
  return (
    <form
      method="GET"
      className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4"
    >
      <div>
        <label className={labelClass}>Buscar por nome</label>
        <input
          type="text"
          name="busca"
          defaultValue={filters.busca ?? ""}
          className={inputClass}
        />
      </div>

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
        <label className={labelClass}>País</label>
        <select
          name="pais"
          defaultValue={filters.pais ?? ""}
          className={inputClass}
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
        <label className={labelClass}>Situação</label>
        <select
          name="situacao"
          defaultValue={filters.situacao ?? ""}
          className={inputClass}
        >
          <option value="">Todas</option>
          {situacoes.map((v) => (
            <option key={v} value={v}>
              {v}
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
          href="/clientes"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
