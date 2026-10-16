import { createClient as createSupabaseClient } from "@/lib/supabase/server";

// Quadro de Aplicações (aba em Vencimentos): processos ativos/pausados com o
// andamento no Department, skills assessment e o pedido de informação aberto
// (case_deadlines) de cada um. Sessão de quem está logado (RLS).

export type LinhaDeAplicacao = {
  caseId: string;
  clientId: string;
  clienteNome: string;
  servico: string;
  aplicacaoStatus: string;
  enviadaEm: string | null;
  skillsStatus: string;
  skillsOrgao: string | null;
  /** Pedido do Department em aberto com o prazo mais próximo, se houver. */
  pedidoAberto: { tipo: string; prazo: string } | null;
};

export async function getAplicacoes(): Promise<{ linhas: LinhaDeAplicacao[]; ativo: boolean }> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, client_id, aplicacao_status, aplicacao_enviada_em, skills_status, skills_orgao, clients(nome), service_types!cases_service_type_id_fkey(nome)",
    )
    .in("status", ["ativo", "pausado"])
    .range(0, 4999);
  // Antes da migração as colunas não existem: o quadro avisa em vez de quebrar.
  if (error) return { linhas: [], ativo: false };

  const ids = (data ?? []).map((c) => c.id as string);
  const pedidos = new Map<string, { tipo: string; prazo: string }>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data: prazos } = await supabase
      .from("case_deadlines")
      .select("case_id, tipo_pedido, prazo_final")
      .in("case_id", ids.slice(i, i + 150))
      .in("status", ["aguardando_documento", "extensao_solicitada"])
      .order("prazo_final");
    for (const p of prazos ?? []) {
      if (!pedidos.has(p.case_id as string)) {
        pedidos.set(p.case_id as string, { tipo: p.tipo_pedido as string, prazo: p.prazo_final as string });
      }
    }
  }

  const linhas = (data ?? []).map((c) => ({
    caseId: c.id as string,
    clientId: c.client_id as string,
    clienteNome: (c.clients as unknown as { nome: string } | null)?.nome ?? "Cliente",
    servico: (c.service_types as unknown as { nome: string } | null)?.nome ?? "Processo",
    aplicacaoStatus: c.aplicacao_status as string,
    enviadaEm: (c.aplicacao_enviada_em as string | null) ?? null,
    skillsStatus: c.skills_status as string,
    skillsOrgao: (c.skills_orgao as string | null) ?? null,
    pedidoAberto: pedidos.get(c.id as string) ?? null,
  }));
  linhas.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));
  return { linhas, ativo: true };
}
