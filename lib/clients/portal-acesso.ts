import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planoDoAcesso, type AcessoAtual, type ContaDoEmail, type Plano } from "./acesso-regra";

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

/**
 * Faz o acesso ao portal seguir o e-mail do cadastro (regra em
 * acesso-regra.ts). Chamar só depois que a edição do cliente foi gravada com
 * a sessão de quem edita (RLS provou que pode editar). Nunca lança; devolve o
 * resultado para o aviso na tela.
 */
export async function sincronizarAcessoComEmail(clientId: string, emailNovo: string | null): Promise<Plano["resultado"] | "erro"> {
  try {
    const admin = createAdminClient();
    const { data: vinculos } = await admin
      .from("client_access")
      .select("id, client_user_id")
      .eq("client_id", clientId)
      .not("client_user_id", "is", null);
    if (!vinculos?.length) return "nada";

    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const usuarios = lista?.users ?? [];
    const acessos: AcessoAtual[] = await Promise.all(
      vinculos.map(async (v) => {
        const { count } = await admin
          .from("client_access")
          .select("id", { count: "exact", head: true })
          .eq("client_user_id", v.client_user_id as string)
          .neq("client_id", clientId);
        return {
          id: v.id as string,
          userId: v.client_user_id as string,
          email: usuarios.find((u) => u.id === v.client_user_id)?.email ?? null,
          outrosClientes: count ?? 0,
        };
      }),
    );

    const email = emailNovo?.trim().toLowerCase() || null;
    const dono = email ? usuarios.find((u) => u.email?.toLowerCase() === email) : undefined;
    let conta: ContaDoEmail = null;
    if (dono) {
      const { data: perfil } = await admin.from("profiles").select("roles(nome)").eq("user_id", dono.id).maybeSingle();
      const papel = (perfil as unknown as { roles?: { nome: string } | null } | null)?.roles?.nome ?? null;
      conta = { userId: dono.id, ehEquipe: Boolean(papel && papel !== "client") };
    }

    const plano = planoDoAcesso(emailNovo, acessos, conta);
    if (plano.resultado === "renomeado") {
      const { error } = await admin.auth.admin.updateUserById(plano.renomear.userId, {
        email: plano.renomear.email,
        email_confirm: true,
      });
      if (error) {
        console.error("[sincronizarAcessoComEmail] trocar e-mail:", error.message);
        return "erro";
      }
    }
    if ("remover" in plano && plano.remover.length) {
      const { error } = await admin.from("client_access").delete().in("id", plano.remover);
      if (error) {
        console.error("[sincronizarAcessoComEmail] remover:", error.code, error.message);
        return "erro";
      }
    }
    if (plano.resultado === "movido") {
      const { error } = await admin.from("client_access").insert({ client_id: clientId, client_user_id: plano.vincular });
      if (error) {
        console.error("[sincronizarAcessoComEmail] vincular:", error.code, error.message);
        return "erro";
      }
    }
    return plano.resultado;
  } catch (e) {
    console.error("[sincronizarAcessoComEmail]", e instanceof Error ? e.message : "erro");
    return "erro";
  }
}
