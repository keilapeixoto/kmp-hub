import Link from "next/link";
import { search } from "@/lib/search/data";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";

  const results = q.length >= 2 ? await search(q) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-kmp-graphite">
        Busca{q ? `: "${q}"` : ""}
      </h1>

      {q.length < 2 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Digite pelo menos 2 caracteres no campo de busca do topo.
        </p>
      ) : results.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Nada encontrado para &quot;{q}&quot;.
        </p>
      ) : (
        <div className="rounded-lg bg-white shadow-sm">
          <ul className="divide-y divide-black/5">
            {results.map((r, i) => (
              <li key={i}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-black/[0.02]"
                >
                  <span>
                    <span className="mr-3 rounded-full bg-kmp-graphite/10 px-2 py-0.5 text-xs font-medium text-kmp-graphite/70">
                      {r.categoria}
                    </span>
                    <span className="font-medium text-kmp-graphite">
                      {r.titulo}
                    </span>
                  </span>
                  {r.detalhe ? (
                    <span className="text-xs text-kmp-graphite/50">
                      {r.detalhe}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
