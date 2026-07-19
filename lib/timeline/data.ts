import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type TimelineEntry = {
  quando: string;
  categoria: string;
  descricao: string;
};

/**
 * Linha do tempo do cliente (seção 6, item 15): agrega as tabelas de
 * histórico que já existem — eventos do lead de origem, mudanças de
 * status/etapa dos processos, documentos enviados, tarefas, compromissos e
 * eventos explícitos de timeline_events. Tudo filtrado pelo RLS da sessão.
 */
export async function getClientTimeline(
  clientId: string,
  leadId: string | null,
): Promise<TimelineEntry[]> {
  const supabase = await createSupabaseClient();

  const [cases, leadEvents, documents, tasks, appointments, explicit] =
    await Promise.all([
      supabase.from("cases").select("id").eq("client_id", clientId),
      leadId
        ? supabase
            .from("lead_events")
            .select("tipo, descricao, created_at")
            .eq("lead_id", leadId)
        : Promise.resolve({ data: [] }),
      supabase
        .from("documents")
        .select("storage_path, created_at")
        .eq("client_id", clientId),
      supabase
        .from("tasks")
        .select("titulo, status, created_at")
        .eq("client_id", clientId),
      supabase
        .from("appointments")
        .select("titulo, tipo, inicio")
        .eq("client_id", clientId),
      supabase
        .from("timeline_events")
        .select("tipo, descricao, created_at")
        .eq("entidade", "client")
        .eq("entidade_id", clientId),
    ]);

  const caseIds = (cases.data ?? []).map((c) => c.id);
  const caseHistory = caseIds.length
    ? await supabase
        .from("case_status_history")
        .select("campo, de, para, created_at")
        .in("case_id", caseIds)
    : { data: [] };

  const entries: TimelineEntry[] = [];

  for (const e of leadEvents.data ?? []) {
    entries.push({
      quando: e.created_at,
      categoria: "Lead",
      descricao: e.descricao,
    });
  }
  for (const h of caseHistory.data ?? []) {
    entries.push({
      quando: h.created_at,
      categoria: "Processo",
      descricao: `${h.campo === "etapa" ? "Etapa" : "Status"}: ${h.de ?? "—"} → ${h.para ?? "—"}`,
    });
  }
  for (const d of documents.data ?? []) {
    entries.push({
      quando: d.created_at,
      categoria: "Documento",
      descricao: `Enviado: ${d.storage_path.split("/").pop()}`,
    });
  }
  for (const t of tasks.data ?? []) {
    entries.push({
      quando: t.created_at,
      categoria: "Tarefa",
      descricao: t.titulo,
    });
  }
  for (const a of appointments.data ?? []) {
    entries.push({
      quando: a.inicio,
      categoria: "Agenda",
      descricao: a.tipo ? `${a.titulo} (${a.tipo})` : a.titulo,
    });
  }
  for (const ev of explicit.data ?? []) {
    entries.push({
      quando: ev.created_at,
      categoria: ev.tipo,
      descricao: ev.descricao,
    });
  }

  return entries.sort((a, b) => b.quando.localeCompare(a.quando));
}
