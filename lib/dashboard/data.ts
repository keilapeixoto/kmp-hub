import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { dayKeySydney, zonedTimeToUtc } from "@/lib/appointments/timezones";
import { OPEN_TASK_STATUSES } from "@/lib/tasks/constants";
import type { Appointment } from "@/lib/appointments/types";

/** Dias sem atualização a partir dos quais um processo ativo conta como "parado". */
export const STALLED_CASE_DAYS = 14;

const PENDING_CHECKLIST_STATUSES = [
  "solicitado",
  "aguardando_cliente",
  "enviado",
  "em_analise",
  "rejeitado",
  "reenvio_solicitado",
  "reenviado",
  "aguardando_aprovacao",
];

export type DashboardMetrics = {
  novosLeads30d: number;
  conversaoPct: number | null;
  clientesAtivos: number;
  processosAtivos: number;
  processosParados: number;
  tarefasVencidas: number;
  documentosPendentes: number;
  atendimentosHoje: Appointment[];
  processosPorEtapa: { etapa: string; total: number }[];
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createSupabaseClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const stalledBefore = new Date(
    Date.now() - STALLED_CASE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  // Hoje no fuso de Sydney (referência operacional), convertido para UTC.
  const sydneyDay = dayKeySydney(new Date().toISOString());
  const dayStart = zonedTimeToUtc(`${sydneyDay}T00:00`, "Australia/Sydney").toISOString();
  const dayEnd = zonedTimeToUtc(`${sydneyDay}T23:59`, "Australia/Sydney").toISOString();

  const [
    novosLeads,
    totalLeads,
    leadsConvertidos,
    clientes,
    processosAtivos,
    processosParados,
    tarefasVencidas,
    documentosPendentes,
    atendimentosHoje,
    casesComEtapa,
    stages,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "convertido"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("cases").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo")
      .lt("updated_at", stalledBefore),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", OPEN_TASK_STATUSES)
      .lt("prazo", today),
    supabase
      .from("checklist_items")
      .select("*", { count: "exact", head: true })
      .in("status", PENDING_CHECKLIST_STATUSES),
    supabase
      .from("appointments")
      .select("*")
      .gte("inicio", dayStart)
      .lte("inicio", dayEnd)
      .order("inicio"),
    supabase.from("cases").select("etapa_id").eq("status", "ativo").not("etapa_id", "is", null),
    supabase.from("case_stages").select("id, nome"),
  ]);

  const stageName = new Map(
    (stages.data ?? []).map((s) => [s.id as string, s.nome as string]),
  );
  const porEtapa = new Map<string, number>();
  for (const row of casesComEtapa.data ?? []) {
    const nome = stageName.get(row.etapa_id as string) ?? "Sem etapa";
    porEtapa.set(nome, (porEtapa.get(nome) ?? 0) + 1);
  }

  const total = totalLeads.count ?? 0;
  const convertidos = leadsConvertidos.count ?? 0;

  return {
    novosLeads30d: novosLeads.count ?? 0,
    conversaoPct: total > 0 ? Math.round((100 * convertidos) / total) : null,
    clientesAtivos: clientes.count ?? 0,
    processosAtivos: processosAtivos.count ?? 0,
    processosParados: processosParados.count ?? 0,
    tarefasVencidas: tarefasVencidas.count ?? 0,
    documentosPendentes: documentosPendentes.count ?? 0,
    atendimentosHoje: (atendimentosHoje.data ?? []) as Appointment[],
    processosPorEtapa: Array.from(porEtapa.entries())
      .map(([etapa, totalEtapa]) => ({ etapa, total: totalEtapa }))
      .sort((a, b) => b.total - a.total),
  };
}
