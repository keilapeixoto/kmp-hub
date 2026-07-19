import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type Guide = {
  id: string;
  service_type_id: string | null;
  titulo: string;
  conteudo: string;
  versao: number;
  atualizado_por: string | null;
  status: "ativo" | "arquivado";
  created_at: string;
  updated_at: string;
};

export type GuideVersion = {
  id: string;
  guide_id: string;
  versao: number;
  conteudo: string;
  autor: string | null;
  created_at: string;
};

export async function getGuides(): Promise<Guide[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("guides")
    .select("*")
    .order("titulo");
  return (data ?? []) as Guide[];
}

export async function getGuide(id: string): Promise<Guide | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Guide | null;
}

export async function getGuideVersions(guideId: string): Promise<GuideVersion[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("guide_versions")
    .select("*")
    .eq("guide_id", guideId)
    .order("versao", { ascending: false });
  return (data ?? []) as GuideVersion[];
}
