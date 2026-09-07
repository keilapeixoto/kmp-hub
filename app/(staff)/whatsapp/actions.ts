"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ConversationStage } from "@/lib/whatsapp/constants";

/** Arrastar uma conversa para outra coluna do Kanban de WhatsApp. */
export async function updateConversationEtapaDrag(conversationId: string, etapa: ConversationStage) {
  const supabase = await createClient();
  await supabase.from("whatsapp_conversations").update({ etapa }).eq("id", conversationId);
  revalidatePath("/whatsapp");
}
