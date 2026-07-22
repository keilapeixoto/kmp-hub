"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { acknowledgeAlert as acknowledgeAlertData } from "@/lib/storage-admin/data";

export async function acknowledgeAlert(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await acknowledgeAlertData(alertId, user.id);
  revalidatePath("/configuracoes/armazenamento");
}
