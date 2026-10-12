import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type ImmigrationNews = {
  id: string;
  titulo: string;
  link: string | null;
  fonte: string | null;
  publicado_em: string;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export async function getRecentImmigrationNews(
  limit = 6,
): Promise<ImmigrationNews[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("immigration_news")
    .select("*")
    .order("publicado_em", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ImmigrationNews[];
}
