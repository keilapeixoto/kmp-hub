import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type ClientNote = {
  id: string;
  client_id: string;
  autor: string;
  texto: string;
  created_at: string;
};

/**
 * Notas internas do cliente, mais recentes primeiro. `ativas` = false enquanto
 * a migração 20261016140000_client_notes.sql não foi aplicada (a tabela não
 * existe e o painel avisa em vez de quebrar a página).
 */
export async function getClientNotes(clientId: string): Promise<{ notas: ClientNote[]; ativas: boolean }> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, client_id, autor, texto, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.error("[getClientNotes]", error.code, error.message);
    }
    return { notas: [], ativas: false };
  }
  return { notas: (data ?? []) as ClientNote[], ativas: true };
}
