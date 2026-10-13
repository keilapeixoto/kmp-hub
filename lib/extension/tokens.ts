/**
 * Token de autenticação da extensão de navegador (preenchimento
 * ImmiAccount). Guarda só o hash (sha256) — o token puro é mostrado uma
 * vez só, na hora de gerar, e nunca mais recuperável. Sempre via
 * createAdminClient() (ver migração 20261013100000_extension_tokens.sql,
 * tabela sem RLS de propósito).
 */
import { randomBytes, createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Gera um token novo, substituindo qualquer um anterior do usuário (um só por vez). */
export async function createExtensionToken(
  userId: string,
  rotulo: string,
): Promise<string> {
  const token = `kmpx_${randomBytes(24).toString("hex")}`;
  const admin = createAdminClient();

  await admin.from("extension_tokens").delete().eq("user_id", userId);
  await admin.from("extension_tokens").insert({
    user_id: userId,
    token_hash: hashToken(token),
    rotulo,
  });

  return token;
}

export async function revokeExtensionToken(userId: string) {
  await createAdminClient().from("extension_tokens").delete().eq("user_id", userId);
}

export async function getExtensionTokenInfo(userId: string): Promise<{
  rotulo: string | null;
  createdAt: string;
  lastUsedAt: string | null;
} | null> {
  const { data } = await createAdminClient()
    .from("extension_tokens")
    .select("rotulo, created_at, last_used_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { rotulo: data.rotulo, createdAt: data.created_at, lastUsedAt: data.last_used_at };
}

/** Resolve um token recebido (header Authorization) pro user_id dono dele. */
export async function resolveExtensionToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("extension_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;

  await admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id;
}
