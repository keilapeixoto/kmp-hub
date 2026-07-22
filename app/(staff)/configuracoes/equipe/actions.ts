"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserRole } from "@/lib/auth";

export type TeamFormState = { error: string | null; success?: boolean };

export async function inviteTeamMember(
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    return { error: "Só admin pode adicionar usuários." };
  }

  const email = formData.get("email");
  const nome = formData.get("nome");
  const roleSlug = formData.get("role");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Informe o e-mail." };
  }
  if (typeof nome !== "string" || !nome.trim()) {
    return { error: "Informe o nome." };
  }
  if (typeof roleSlug !== "string" || !roleSlug.trim()) {
    return { error: "Selecione a função." };
  }

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/dashboard`;

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    { data: { nome: nome.trim(), role: roleSlug }, redirectTo },
  );

  if (inviteError) {
    return {
      error: "Não foi possível convidar este e-mail. Confira e tente de novo.",
    };
  }

  revalidatePath("/configuracoes/equipe");
  redirect("/configuracoes/equipe");
}

export async function updateTeamMember(
  userId: string,
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const currentRole = await getCurrentUserRole();
  if (currentRole !== "admin") {
    return { error: "Só admin pode editar outros usuários." };
  }

  const nome = formData.get("nome");
  const cargo = formData.get("cargo");
  const telefone = formData.get("telefone");
  const roleSlug = formData.get("role");
  const ativo = formData.get("ativo") === "on";

  if (typeof nome !== "string" || !nome.trim()) {
    return { error: "Informe o nome." };
  }
  if (typeof roleSlug !== "string" || !roleSlug.trim()) {
    return { error: "Selecione a função." };
  }

  const admin = createAdminClient();
  const { data: roleRow } = await admin
    .from("roles")
    .select("id")
    .eq("nome", roleSlug)
    .single();

  if (!roleRow) {
    return { error: "Função inválida." };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      nome: nome.trim(),
      cargo: typeof cargo === "string" && cargo.trim() ? cargo.trim() : null,
      telefone:
        typeof telefone === "string" && telefone.trim() ? telefone.trim() : null,
      role_id: roleRow.id,
      ativo,
    })
    .eq("user_id", userId);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/configuracoes/equipe");
  revalidatePath(`/configuracoes/equipe/${userId}`);
  return { error: null };
}

export async function uploadAvatar(userId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const isSelf = user.id === userId;
  const role = await getCurrentUserRole();
  if (!isSelf && role !== "admin") return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  // Usa o cliente da sessão — o RLS de storage.objects (avatars_manage_own /
  // avatars_manage_admin) já garante que só o próprio dono ou um admin grava
  // nessa pasta.
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ foto_url: `${publicUrl}?v=${Date.now()}` })
    .eq("user_id", userId);

  revalidatePath("/configuracoes/equipe");
  revalidatePath(`/configuracoes/equipe/${userId}`);
  revalidatePath("/perfil");
}

export async function deleteTeamMember(userId: string) {
  const role = await getCurrentUserRole();
  if (role !== "admin") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId) return; // não deixa se autoexcluir

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);

  revalidatePath("/configuracoes/equipe");
  redirect("/configuracoes/equipe");
}

export type SelfProfileState = { error: string | null };

export async function updateOwnProfile(
  _prevState: SelfProfileState,
  formData: FormData,
): Promise<SelfProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const nome = formData.get("nome");
  const cargo = formData.get("cargo");
  const telefone = formData.get("telefone");

  if (typeof nome !== "string" || !nome.trim()) {
    return { error: "Informe o nome." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      nome: nome.trim(),
      cargo: typeof cargo === "string" && cargo.trim() ? cargo.trim() : null,
      telefone:
        typeof telefone === "string" && telefone.trim() ? telefone.trim() : null,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/perfil");
  return { error: null };
}
