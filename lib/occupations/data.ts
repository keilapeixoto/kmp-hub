import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Occupation, OccupationFilters } from "./types";

export async function getOccupations(
  filters: OccupationFilters = {},
): Promise<Occupation[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("occupations")
    .select("*")
    .eq("status", "ativo")
    .order("nome");

  if (filters.categoria) {
    query = query.eq("categoria", filters.categoria);
  }

  const termo = filters.q?.trim().replace(/[,()%]/g, "");
  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,codigo_anzsco.ilike.%${termo}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Occupation[];
}

export async function getOccupation(id: string): Promise<Occupation | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("occupations")
    .select("*")
    .eq("id", id)
    .eq("status", "ativo")
    .maybeSingle();
  return data as Occupation | null;
}
