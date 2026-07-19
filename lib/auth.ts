import { createClient } from "@/lib/supabase/server";

/**
 * Função do usuário autenticado, via RPC para get_user_role() no Postgres.
 * Não depende de RLS na tabela roles (que só admin/diretor conseguem ler).
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_role");
  if (error) return null;
  return (data as string | null) ?? null;
}

/**
 * Nome/idioma do próprio perfil. Sem join com roles — esse embed é bloqueado
 * por RLS para quem não é admin/diretor (ver getCurrentUserRole acima).
 */
export async function getCurrentUserProfile(): Promise<{
  nome: string;
  idioma: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("nome, idioma")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ?? null;
}
