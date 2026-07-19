import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type {
  Case,
  CaseFilters,
  CaseStage,
  CaseStatusHistoryEntry,
  ServiceType,
} from "./types";

export type TeamMember = { user_id: string; nome: string; role: string };

/** Via RPC (list_team_members, SECURITY DEFINER) — a tabela roles é restrita a admin/diretor via RLS. */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase.rpc("list_team_members");
  return (data ?? []) as TeamMember[];
}

/** Equipe completa (todas as funções exceto partner/client) — via RPC list_staff_members (Sprint 6). */
export async function getTeamMembersStaff(): Promise<TeamMember[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase.rpc("list_staff_members");
  return (data ?? []) as TeamMember[];
}

export async function getServiceTypes(): Promise<ServiceType[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("service_types")
    .select("*")
    .order("nome");
  return (data ?? []) as ServiceType[];
}

export async function getServiceType(id: string): Promise<ServiceType | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("service_types")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as ServiceType | null;
}

export async function getCaseStages(serviceTypeId: string): Promise<CaseStage[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_stages")
    .select("*")
    .eq("service_type_id", serviceTypeId)
    .order("ordem");
  return (data ?? []) as CaseStage[];
}

export async function getAllCaseStages(): Promise<CaseStage[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_stages")
    .select("*")
    .order("ordem");
  return (data ?? []) as CaseStage[];
}

export async function getCases(filters: CaseFilters): Promise<Case[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.consultor) query = query.eq("consultor_id", filters.consultor);
  if (filters.servicoTipo) query = query.eq("service_type_id", filters.servicoTipo);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.prioridade) query = query.eq("prioridade", filters.prioridade);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Case[];
}

export async function getCase(id: string): Promise<Case | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Case | null;
}

export async function getCasesByClient(clientId: string): Promise<Case[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("cases")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Case[];
}

export async function getCaseStatusHistory(
  caseId: string,
): Promise<CaseStatusHistoryEntry[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_status_history")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CaseStatusHistoryEntry[];
}
