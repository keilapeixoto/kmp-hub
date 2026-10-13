/**
 * Acesso à tabela google_connections — sempre via createAdminClient()
 * (secret key), porque a tabela não tem política RLS nenhuma de propósito
 * (ver migração 20261013090000_google_connections.sql). Nunca importar em
 * componente client.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./oauth";

export type GoogleConnection = {
  userId: string;
  googleEmail: string | null;
  scope: string;
  connectedAt: string;
};

export async function getGoogleConnection(
  userId: string,
): Promise<GoogleConnection | null> {
  const { data } = await createAdminClient()
    .from("google_connections")
    .select("user_id, google_email, scope, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: data.user_id,
    googleEmail: data.google_email,
    scope: data.scope,
    connectedAt: data.created_at,
  };
}

export async function saveGoogleConnection(params: {
  userId: string;
  refreshToken: string;
  googleEmail: string | null;
  scope: string;
}) {
  await createAdminClient().from("google_connections").upsert(
    {
      user_id: params.userId,
      refresh_token: params.refreshToken,
      google_email: params.googleEmail,
      scope: params.scope,
    },
    { onConflict: "user_id" },
  );
}

export async function deleteGoogleConnection(userId: string) {
  await createAdminClient().from("google_connections").delete().eq("user_id", userId);
}

/**
 * Devolve um access token válido pro usuário, renovando via refresh_token.
 * Retorna null se a conta não estiver conectada ou o refresh falhar
 * (token revogado — precisa reconectar).
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  try {
    const { accessToken } = await refreshAccessToken(data.refresh_token);
    return accessToken;
  } catch {
    return null;
  }
}
