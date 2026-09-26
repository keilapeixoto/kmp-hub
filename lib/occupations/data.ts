import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { OCCUPATIONS_PAGE_SIZE } from "./constants";
import type { Occupation, OccupationFilters } from "./types";

export type OccupationsPage = {
  rows: Occupation[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getOccupations(
  filters: OccupationFilters & { page?: number } = {},
): Promise<OccupationsPage> {
  const supabase = await createSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * OCCUPATIONS_PAGE_SIZE;
  const to = from + OCCUPATIONS_PAGE_SIZE - 1;

  let query = supabase
    .from("occupations")
    .select("*", { count: "exact" })
    .eq("status", "ativo")
    .order("nome")
    .range(from, to);

  if (filters.categoria) {
    query = query.eq("categoria", filters.categoria);
  }

  const termo = filters.q?.trim().replace(/[,()%]/g, "");
  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,codigo_anzsco.ilike.%${termo}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as Occupation[],
    total: count ?? 0,
    page,
    pageSize: OCCUPATIONS_PAGE_SIZE,
  };
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
