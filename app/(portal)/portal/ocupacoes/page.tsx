import Link from "next/link";
import { getOccupations } from "@/lib/occupations/data";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";
import { PortalHeader } from "../_components/portal-header";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortalOcupacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q) ?? "";
  const categoria = firstValue(params.categoria) ?? "";
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);

  const { rows: occupations, total, pageSize } = await getOccupations({
    q,
    categoria,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoria) sp.set("categoria", categoria);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/portal/ocupacoes?${qs}` : "/portal/ocupacoes";
  }

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-heading text-2xl text-kmp-graphite">Ocupações</h1>

        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Informação de referência pública. Fale com sua consultora antes de
          tomar decisões com base nesses dados.
        </p>

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
                href="/portal/ocupacoes"
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
                    href={`/portal/ocupacoes/${o.id}`}
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

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-kmp-graphite/70">
            <span>
              Página {page} de {totalPages} · {total} ocupações
            </span>
            <div className="flex gap-3">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="hover:text-kmp-orange">
                  ← Anterior
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="hover:text-kmp-orange">
                  Próxima →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
