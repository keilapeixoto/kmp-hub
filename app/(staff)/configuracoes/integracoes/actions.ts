"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteGoogleConnection } from "@/lib/google/connections";
import { createExtensionToken, revokeExtensionToken } from "@/lib/extension/tokens";

export async function disconnectGoogle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await deleteGoogleConnection(user.id);
  revalidatePath("/configuracoes/integracoes");
  revalidatePath("/inicio");
}

export type GenerateTokenState = {
  token: string | null;
};

export async function generateExtensionToken(): Promise<GenerateTokenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { token: null };

  const token = await createExtensionToken(user.id, "Extensão ImmiAccount - Chrome");
  revalidatePath("/configuracoes/integracoes");
  return { token };
}

export async function revokeExtensionTokenAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await revokeExtensionToken(user.id);
  revalidatePath("/configuracoes/integracoes");
}
