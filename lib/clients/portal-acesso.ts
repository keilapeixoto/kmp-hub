import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcessoAoPortal = { id: string; email: string | null; jaEntrou: boolean };

/**
 * Contas que entram no portal com este cliente. O acesso é o vínculo em
 * client_access (conta de login ↔ cliente), não o e-mail do cadastro: mudar o
 * e-mail no perfil não muda quem entra. Os vínculos vêm com a sessão de quem
 * olha (RLS: só admin/diretor veem); só então o e-mail de login é lido pelo
 * cliente admin (secret key, servidor).
 */
export async function getAcessosAoPortal(clientId: string): Promise<AcessoAoPortal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_access")
    .select("id, client_user_id")
    .eq("client_id", clientId)
    .not("client_user_id", "is", null);
  if (!data?.length) return [];
  const admin = createAdminClient();
  return Promise.all(
    data.map(async (a) => {
      const { data: u } = await admin.auth.admin.getUserById(a.client_user_id as string);
      return { id: a.id as string, email: u.user?.email ?? null, jaEntrou: Boolean(u.user?.last_sign_in_at) };
    }),
  );
}
