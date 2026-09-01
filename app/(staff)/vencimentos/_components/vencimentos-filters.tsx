import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

export function VencimentosFilters({ busca }: { busca: string }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm"
    >
      <div className="min-w-[220px] flex-1">
        <label className={labelClass}>Buscar por nome</label>
        <input
          type="text"
          name="busca"
          defaultValue={busca}
          className={inputClass}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href="/vencimentos"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          Limpar
        </Link>
      </div>
    </form>
  );
}
