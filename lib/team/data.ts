import { createAdminClient } from "@/lib/supabase/admin";
import type { TeamMember } from "./types";

/**
 * Gestão de usuários é admin only — usa o cliente admin de propósito, já que
 * precisa cruzar e-mail (só existe em auth.users, não exposto por RLS normal)
 * com profiles/roles.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, nome, cargo, telefone, foto_url, ativo, created_at, roles(nome)");

  const { data: usersPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (profiles ?? [])
    .filter((p) => (p.roles as unknown as { nome: string } | null)?.nome !== "client")
    .map((p) => ({
      userId: p.user_id,
      email: emailByUserId.get(p.user_id) ?? "",
      nome: p.nome,
      cargo: p.cargo,
      telefone: p.telefone,
      fotoUrl: p.foto_url,
      role: (p.roles as unknown as { nome: string } | null)?.nome ?? "client",
      ativo: p.ativo,
      createdAt: p.created_at,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function getTeamMember(userId: string): Promise<TeamMember | null> {
  const members = await getTeamMembers();
  return members.find((m) => m.userId === userId) ?? null;
}
