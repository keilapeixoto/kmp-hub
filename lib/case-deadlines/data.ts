import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/clients/utils";
import { dueMilestoneToday } from "./utils";
import { getReminderEmail } from "./email-templates";
import { REQUEST_TYPE_LABELS, type ReminderMilestone } from "./constants";
import type {
  ActiveCaseOption,
  CaseDeadlineReminder,
  CaseDeadlineWithContext,
  DueReminder,
} from "./types";

type CaseDeadlineRawRow = {
  id: string;
  case_id: string;
  tipo_pedido: string;
  data_pedido: string;
  prazo_final: string;
  status: string;
  documento_recebido_em: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  cases: { client_id: string; clients: { id: string; nome: string; email: string | null } | null } | null;
};

function mapRow(row: CaseDeadlineRawRow): CaseDeadlineWithContext {
  return {
    id: row.id,
    case_id: row.case_id,
    tipo_pedido: row.tipo_pedido as CaseDeadlineWithContext["tipo_pedido"],
    data_pedido: row.data_pedido,
    prazo_final: row.prazo_final,
    status: row.status as CaseDeadlineWithContext["status"],
    documento_recebido_em: row.documento_recebido_em,
    notas: row.notas,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_id: row.cases?.client_id ?? null,
    client_nome: row.cases?.clients?.nome ?? "—",
    client_email: row.cases?.clients?.email ?? null,
  };
}

export async function getCaseDeadlines(): Promise<CaseDeadlineWithContext[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("case_deadlines")
    .select(
      "id, case_id, tipo_pedido, data_pedido, prazo_final, status, documento_recebido_em, notas, created_at, updated_at, cases(client_id, clients(id, nome, email))",
    )
    .order("prazo_final", { ascending: true })
    .range(0, 4999);

  if (error) throw error;
  return ((data ?? []) as unknown as CaseDeadlineRawRow[]).map(mapRow);
}

export async function getActiveCaseOptions(): Promise<ActiveCaseOption[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("id, clients(nome), service_types(nome)")
    .eq("status", "ativo")
    .order("created_at", { ascending: false })
    .range(0, 4999);

  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string;
    clients: { nome: string } | null;
    service_types: { nome: string } | null;
  }[]).map((row) => ({
    id: row.id,
    client_nome: row.clients?.nome ?? "—",
    service_type_nome: row.service_types?.nome ?? "Sem tipo de serviço",
  }));
}

/** Lembretes devidos hoje (marco bate exatamente) que ainda não têm log de envio bem-sucedido. */
export async function getDueReminders(): Promise<DueReminder[]> {
  const deadlines = await getCaseDeadlines();

  const candidates = deadlines
    .filter((d) => d.status === "aguardando_documento")
    .map((d) => ({ deadline: d, milestone: dueMilestoneToday(d.prazo_final) }))
    .filter(
      (c): c is { deadline: CaseDeadlineWithContext; milestone: ReminderMilestone } =>
        c.milestone !== null,
    );

  if (candidates.length === 0) return [];

  const supabase = await createSupabaseClient();
  const { data: sentLogs } = await supabase
    .from("case_deadline_reminders")
    .select("case_deadline_id, marco_dias")
    .in(
      "case_deadline_id",
      candidates.map((c) => c.deadline.id),
    )
    .eq("status", "enviado");

  const sentSet = new Set(
    (sentLogs ?? []).map((r) => `${r.case_deadline_id}:${r.marco_dias}`),
  );

  const due = candidates.filter(
    (c) => !sentSet.has(`${c.deadline.id}:${c.milestone}`),
  );

  return Promise.all(
    due.map(async (c): Promise<DueReminder> => {
      const dias = daysUntil(c.deadline.prazo_final);
      const { subject, paragraphs } = await getReminderEmail(c.milestone, {
        nome_estudante: c.deadline.client_nome,
        tipo_documento: REQUEST_TYPE_LABELS[c.deadline.tipo_pedido] ?? c.deadline.tipo_pedido,
        data_limite: new Date(c.deadline.prazo_final).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        }),
        dias_restantes: dias,
      });
      return { ...c, preview: { subject, paragraphs } };
    }),
  );
}

export async function getReminderLog(caseDeadlineId: string): Promise<CaseDeadlineReminder[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_deadline_reminders")
    .select("*")
    .eq("case_deadline_id", caseDeadlineId)
    .order("enviado_em", { ascending: false });
  return (data ?? []) as CaseDeadlineReminder[];
}
