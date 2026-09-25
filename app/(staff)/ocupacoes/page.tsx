import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { getOccupations } from "@/lib/occupations/data";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OcupacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const categoria = firstValue(params.categoria) ?? "";

  const [role, occupations] = await Promise.all([
    getCurrentUserRole(),
    getOccupations({ q, categoria }),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Ocupações</h1>
        {isAdmin ? (
          <Link
            href="/configuracoes/ocupacoes"
            className="text-sm font-medium text-kmp-orange hover:underline"
          >
            Importar CSV
          </Link>
        ) : null}
      </div>

      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou código ANZSCO"
          aria-label="Buscar por nome ou código ANZSCO"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange sm:col-span-2"
        />
        <select
          name="categoria"
          defaultValue={categoria}
          aria-label="Filtrar por categoria"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        >
          <option value="">Todas as categorias</option>
          {OCCUPATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Filtrar
          </button>
          {q || categoria ? (
            <Link
              href="/ocupacoes"
              className="ml-3 text-sm text-kmp-graphite/70 hover:text-kmp-orange"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="rounded-lg bg-white shadow-sm">
        {occupations.length === 0 ? (
          <p className="p-8 text-center text-sm text-kmp-graphite/60">
            Nenhuma ocupação encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {occupations.map((o) => (
              <li key={o.id} className="p-4 text-sm">
                <Link
                  href={`/ocupacoes/${o.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {o.nome} · {o.codigo_anzsco}
                </Link>
                <p className="mt-1 text-xs text-kmp-graphite/50">
                  {o.categoria} · {o.autoridade_avaliadora}
                </p>
                <div className="mt-2 flex gap-2">
                  {o.na_csol ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      CSOL
                    </span>
                  ) : null}
                  {o.na_mltssl_legada ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      MLTSSL · válido para 485
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
