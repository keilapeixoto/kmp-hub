"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteGoogleConnection } from "@/lib/google/connections";

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
