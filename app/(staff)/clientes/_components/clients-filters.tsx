import Link from "next/link";
import { Search } from "lucide-react";
import type { ClientFilters } from "@/lib/clients/types";

const selectClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "mb-1 block text-xs font-semibold text-kmp-text/70";

export function ClientsFilters({
  filters,
  responsaveis,
  paises,
  situacoes,
}: {
  filters: ClientFilters;
  /** Equipe inteira (admin, diretor, consultor...), não só a função consultor. */
  responsaveis: { user_id: string; nome: string }[];
  paises: string[];
  situacoes: string[];
}) {
  return (
    <form method="GET" className="rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <label htmlFor="busca-clientes" className="sr-only">
        Buscar cliente por nome
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-kmp-graphite/50"
        />
        <input
          id="busca-clientes"
          type="text"
          name="busca"
          defaultValue={filters.busca ?? ""}
          placeholder="Buscar cliente por nome…"
          className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-12 pr-4 text-base text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {responsaveis.length > 0 ? (
          <div>
            <label htmlFor="filtro-responsavel" className={labelClass}>
              Responsável
            </label>
            <select
              id="filtro-responsavel"
              name="consultor"
              defaultValue={filters.consultor ?? ""}
              className={selectClass}
            >
              <option value="">Todos</option>
              {responsaveis.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="filtro-pais" className={labelClass}>
            País
          </label>
          <select id="filtro-pais" name="pais" defaultValue={filters.pais ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {paises.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-situacao" className={labelClass}>
            Situação
          </label>
          <select
            id="filtro-situacao"
            name="situacao"
            defaultValue={filters.situacao ?? ""}
            className={selectClass}
          >
            <option value="">Todas</option>
            {situacoes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href="/clientes"
          className="rounded-full px-4 py-2 text-sm font-medium text-kmp-text/70 transition hover:text-kmp-text"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
