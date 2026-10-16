import { createClient } from "@/lib/supabase/server";
import { dayKeySydney } from "@/lib/appointments/timezones";
import type { CorViva } from "@/components/ui/vivid";

// O que pede atenção de quem está logado (sino do cabeçalho). Tudo com a
// sessão: o RLS já limita cada pessoa ao que ela pode ver.

export type Notificacao = { id: string; titulo: string; detalhe: string | null; href: string };
export type GrupoDeNotificacoes = {
  chave: string;
  titulo: string;
  total: number;
  itens: Notificacao[];
  verTudo: string;
  /** Cor do grupo no painel (mesma do módulo; visto vencido é sempre vermelho). */
  cor: CorViva;
};

type ComCliente = { cases?: { id: string; clients?: { nome: string } | null } | null } | null;

export async function getNotificacoes(usuarioId: string): Promise<GrupoDeNotificacoes[]> {
  const supabase = await createClient();
  const hoje = dayKeySydney(new Date().toISOString());

  // Visto vencido nos últimos 90 dias (os antigos ficam no radar de Vencimentos).
  const noventaDias = dayKeySydney(new Date(Date.now() - 90 * 864e5).toISOString());
  const [vistos, tarefas, documentos, formularios, leads] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome, visto_atual_subclasse, visto_atual_validade", { count: "exact" })
      .eq("is_demo", false)
      .lt("visto_atual_validade", hoje)
      .gte("visto_atual_validade", noventaDias)
      .order("visto_atual_validade", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, titulo, prazo", { count: "exact" })
      .eq("responsavel", usuarioId)
      .in("status", ["pendente", "em_andamento"])
      .lte("prazo", hoje)
      .order("prazo")
      .limit(5),
    supabase
      .from("checklist_items")
      .select("id, nome, checklists(cases(id, clients(nome)))", { count: "exact" })
      .in("status", ["enviado", "reenviado"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("case_forms")
      .select("id, enviado_em, cases(id, clients(nome))", { count: "exact" })
      .eq("status", "enviado")
      .order("enviado_em", { ascending: false })
      .limit(5),
    supabase
      .from("leads")
      .select("id, nome, created_at", { count: "exact" })
      .eq("status", "novo")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const data = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
  const grupos: GrupoDeNotificacoes[] = [
    {
      chave: "vistos",
      titulo: "Vistos vencidos",
      cor: "vermelho",
      total: vistos.count ?? 0,
      verTudo: "/vencimentos",
      itens: (vistos.data ?? []).map((c) => ({
        id: c.id as string,
        titulo: c.nome as string,
        detalhe: `${c.visto_atual_subclasse ? `${c.visto_atual_subclasse} · ` : ""}venceu em ${data(c.visto_atual_validade as string)}`,
        href: `/clientes/${c.id}`,
      })),
    },
    {
      chave: "tarefas",
      cor: "laranja",
      titulo: "Tarefas vencidas ou para hoje",
      total: tarefas.count ?? 0,
      verTudo: "/tarefas",
      itens: (tarefas.data ?? []).map((t) => ({
        id: t.id as string,
        titulo: t.titulo as string,
        detalhe: t.prazo === hoje ? "hoje" : `venceu em ${new Date(`${t.prazo}T00:00:00`).toLocaleDateString("pt-BR")}`,
        href: `/tarefas/${t.id}`,
      })),
    },
    {
      chave: "documentos",
      cor: "roxo",
      titulo: "Documentos enviados pelos clientes",
      total: documentos.count ?? 0,
      verTudo: "/documentos",
      itens: (documentos.data ?? []).map((d) => {
        const caso = (d as unknown as { checklists?: ComCliente }).checklists?.cases;
        return {
          id: d.id as string,
          titulo: d.nome as string,
          detalhe: caso?.clients?.nome ?? null,
          href: caso ? `/processos/${caso.id}#checklist` : "/documentos",
        };
      }),
    },
    {
      chave: "formularios",
      cor: "verde",
      titulo: "Formulários enviados",
      total: formularios.count ?? 0,
      verTudo: "/inicio",
      itens: (formularios.data ?? []).map((f) => {
        const caso = (f as unknown as ComCliente)?.cases;
        return {
          id: f.id as string,
          titulo: caso?.clients?.nome ?? "Formulário",
          detalhe: f.enviado_em ? new Date(f.enviado_em as string).toLocaleDateString("pt-BR") : null,
          href: caso ? `/processos/${caso.id}#formulario` : "/inicio",
        };
      }),
    },
    {
      chave: "leads",
      cor: "turquesa",
      titulo: "Leads novos",
      total: leads.count ?? 0,
      verTudo: "/leads",
      itens: (leads.data ?? []).map((l) => ({
        id: l.id as string,
        titulo: l.nome as string,
        detalhe: new Date(l.created_at as string).toLocaleDateString("pt-BR"),
        href: `/leads/${l.id}`,
      })),
    },
  ];
  return grupos.filter((g) => g.total > 0);
}
