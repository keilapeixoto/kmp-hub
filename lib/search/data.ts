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

  // Processo é do cliente: aparece como detalhe do cliente (visto e
  // situação), não como resultado separado. Lead que já virou cliente também
  // não aparece de novo.
  const clientIds = (clients.data ?? []).map((c) => c.id);
  const leadIds = (leads.data ?? []).map((l) => l.id);
  const [cases, convertidos] = await Promise.all([
    clientIds.length
      ? supabase
          .from("cases")
          .select("client_id, status, service_types(nome)")
          .in("client_id", clientIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    leadIds.length
      ? supabase.from("clients").select("lead_id").in("lead_id", leadIds)
      : Promise.resolve({ data: [] as { lead_id: string | null }[] }),
  ]);
  const jaClientes = new Set(
    ((convertidos.data ?? []) as { lead_id: string | null }[]).map((c) => c.lead_id).filter(Boolean),
  );
  const processos = new Map<string, string[]>();
  for (const c of (cases.data ?? []) as { client_id: string; status: string; service_types: { nome: string } | null }[]) {
    const lista = processos.get(c.client_id) ?? [];
    lista.push(`${c.service_types?.nome ?? "Processo"} · ${c.status}`);
    processos.set(c.client_id, lista);
  }

  const results: SearchResult[] = [];
  for (const l of leads.data ?? []) {
    if (jaClientes.has(l.id)) continue;
    results.push({
      categoria: "Lead",
      titulo: l.nome,
      detalhe: l.status,
      href: `/leads/${l.id}`,
    });
  }
  for (const c of clients.data ?? []) {
    const lista = processos.get(c.id) ?? [];
    results.push({
      categoria: "Cliente",
      titulo: c.nome,
      detalhe: lista.length === 0 ? c.pais : lista.length === 1 ? lista[0] : `${lista[0]} (+${lista.length - 1})`,
      href: `/clientes/${c.id}`,
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
