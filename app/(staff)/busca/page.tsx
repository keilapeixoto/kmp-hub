import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

type Result = {
  categoria: string;
  titulo: string;
  detalhe: string | null;
  href: string;
};

/**
 * Busca global (seção 6, item 16). As queries rodam com o cliente da sessão,
 * então o RLS filtra automaticamente por função — cada pessoa só encontra o
 * que já teria permissão de ver nas telas normais.
 */
async function search(q: string): Promise<Result[]> {
  const supabase = await createClient();
  // Vírgulas quebrariam a sintaxe do .or() do PostgREST — remove por segurança.
  const like = `%${q.replace(/,/g, " ")}%`;
  const contato = `nome.ilike.${like},email.ilike.${like},telefone.ilike.${like}`;

  const [leads, clients, tasks, guides] = await Promise.all([
    supabase.from("leads").select("id, nome, status").or(contato).limit(10),
    supabase.from("clients").select("id, nome, pais").or(contato).limit(10),
    supabase.from("tasks").select("id, titulo, status").ilike("titulo", like).limit(10),
    supabase.from("guides").select("id, titulo, versao").ilike("titulo", like).limit(10),
  ]);

  const clientIds = (clients.data ?? []).map((c) => c.id);
  const cases = clientIds.length
    ? await supabase
        .from("cases")
        .select("id, client_id, status")
        .in("client_id", clientIds)
        .limit(10)
    : { data: [] };

  const clientName = new Map((clients.data ?? []).map((c) => [c.id, c.nome]));

  const results: Result[] = [];
  for (const l of leads.data ?? []) {
    results.push({
      categoria: "Lead",
      titulo: l.nome,
      detalhe: l.status,
      href: `/leads/${l.id}`,
    });
  }
  for (const c of clients.data ?? []) {
    results.push({
      categoria: "Cliente",
      titulo: c.nome,
      detalhe: c.pais,
      href: `/clientes/${c.id}`,
    });
  }
  for (const cs of cases.data ?? []) {
    results.push({
      categoria: "Processo",
      titulo: clientName.get(cs.client_id) ?? "Processo",
      detalhe: cs.status,
      href: `/processos/${cs.id}`,
    });
  }
  for (const t of tasks.data ?? []) {
    results.push({
      categoria: "Tarefa",
      titulo: t.titulo,
      detalhe: t.status,
      href: `/tarefas/${t.id}`,
    });
  }
  for (const g of guides.data ?? []) {
    results.push({
      categoria: "Guia",
      titulo: g.titulo,
      detalhe: `versão ${g.versao}`,
      href: `/guias/${g.id}`,
    });
  }
  return results;
}

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
