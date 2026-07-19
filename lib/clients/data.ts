import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientFilters,
  ClientRelationWithRelated,
  IdentityDocument,
} from "./types";

export async function getClients(filters: ClientFilters): Promise<Client[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.consultor) query = query.eq("consultor_id", filters.consultor);
  if (filters.pais) query = query.eq("pais", filters.pais);
  if (filters.situacao) query = query.eq("situacao", filters.situacao);
  if (filters.busca) query = query.ilike("nome", `%${filters.busca}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Client | null;
}

export async function getClientHasPortalAccess(id: string): Promise<boolean> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("client_access")
    .select("id")
    .eq("client_id", id)
    .not("client_user_id", "is", null)
    .maybeSingle();
  return data !== null;
}

export async function getClientByLeadId(leadId: string): Promise<Client | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  return data as Client | null;
}

export async function getClientRelations(
  clientId: string,
): Promise<ClientRelationWithRelated[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("client_relations")
    .select("*, related:related_client_id(id, nome)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as ClientRelationWithRelated[];
}

export async function getIdentityDocuments(
  clientId: string,
): Promise<IdentityDocument[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("identity_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("validade", { ascending: true, nullsFirst: false });
  return (data ?? []) as IdentityDocument[];
}

type DistinctColumn = "pais" | "situacao";

export async function getDistinctClientValues(
  column: DistinctColumn,
): Promise<string[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select(column)
    .not(column, "is", null);

  const values = new Set<string>();
  (data ?? []).forEach((row) => {
    const value = (row as Record<DistinctColumn, string | null>)[column];
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
