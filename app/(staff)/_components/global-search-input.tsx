"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type SearchResult = {
  categoria: string;
  titulo: string;
  detalhe: string | null;
  href: string;
};

export function GlobalSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    debounceRef.current = setTimeout(
      () => {
        if (trimmed.length < 2) {
          setResults([]);
          return;
        }
        const requestId = ++requestIdRef.current;
        fetch(`/api/busca?q=${encodeURIComponent(trimmed)}`)
          .then((res) => res.json())
          .then((data: { results: SearchResult[] }) => {
            if (requestId === requestIdRef.current) {
              setResults(data.results ?? []);
            }
          })
          .catch(() => {
            if (requestId === requestIdRef.current) setResults([]);
          });
      },
      trimmed.length < 2 ? 0 : 250,
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <form
      action="/busca"
      method="GET"
      className="relative max-w-md flex-1"
      onSubmit={() => setOpen(false)}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kmp-graphite/40" />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar leads, clientes, tarefas, guias…"
        aria-label="Busca global"
        autoComplete="off"
        className="w-full rounded-md border border-black/10 py-2 pl-9 pr-3 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
      />

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-black/10 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-kmp-graphite/50">
              Nada encontrado para &quot;{query}&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      goTo(r.href);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-black/[0.03]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-full bg-kmp-graphite/10 px-2 py-0.5 text-xs font-medium text-kmp-graphite/70">
                        {r.categoria}
                      </span>
                      <span className="truncate font-medium text-kmp-graphite">
                        {r.titulo}
                      </span>
                    </span>
                    {r.detalhe ? (
                      <span className="shrink-0 text-xs text-kmp-graphite/50">
                        {r.detalhe}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-black/5">
            <button
              type="submit"
              onMouseDown={(e) => {
                e.preventDefault();
                router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-kmp-orange hover:bg-black/[0.03]"
            >
              Ver todos os resultados →
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
