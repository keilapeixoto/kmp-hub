import { createClient } from "@/lib/supabase/server";
import type { ConsultantOption, Lead, LeadEvent, LeadFilters } from "./types";

export async function getLeads(filters: LeadFilters): Promise<Lead[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.consultor) query = query.eq("consultor_id", filters.consultor);
  if (filters.servico) query = query.eq("servico_interesse", filters.servico);
  if (filters.origem) query = query.eq("origem", filters.origem);
  if (filters.pais) query = query.eq("pais", filters.pais);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.de) query = query.gte("created_at", filters.de);
  if (filters.ate) query = query.lte("created_at", `${filters.ate}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Lead | null;
}

export async function getLeadEvents(leadId: string): Promise<LeadEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadEvent[];
}

/** Via RPC (list_consultants, SECURITY DEFINER) — a tabela roles é restrita a admin/diretor via RLS. */
export async function getConsultants(): Promise<ConsultantOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_consultants");
  return (data ?? []) as ConsultantOption[];
}

type DistinctColumn = "origem" | "servico_interesse" | "pais";

export async function getDistinctLeadValues(
  column: DistinctColumn,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(column)
    .not(column, "is", null);

  const values = new Set<string>();
  (data ?? []).forEach((row) => {
    const value = (row as Record<DistinctColumn, string | null>)[column];
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
