import { createClient } from "@/lib/supabase/server";
import { dayKeySydney } from "@/lib/appointments/timezones";

// O que pede atenção de quem está logado (sino do cabeçalho). Tudo com a
// sessão: o RLS já limita cada pessoa ao que ela pode ver.

export type Notificacao = { id: string; titulo: string; detalhe: string | null; href: string };
export type GrupoDeNotificacoes = { chave: string; titulo: string; total: number; itens: Notificacao[]; verTudo: string };

type ComCliente = { cases?: { id: string; clients?: { nome: string } | null } | null } | null;

export async function getNotificacoes(usuarioId: string): Promise<GrupoDeNotificacoes[]> {
  const supabase = await createClient();
  const hoje = dayKeySydney(new Date().toISOString());

  const [tarefas, documentos, formularios, leads] = await Promise.all([
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

  const grupos: GrupoDeNotificacoes[] = [
    {
      chave: "tarefas",
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
