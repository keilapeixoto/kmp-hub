import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
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
export async function search(q: string): Promise<SearchResult[]> {
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
    : { data: [] as { id: string; client_id: string; status: string }[] };

  const clientName = new Map((clients.data ?? []).map((c) => [c.id, c.nome]));

  const results: SearchResult[] = [];
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
