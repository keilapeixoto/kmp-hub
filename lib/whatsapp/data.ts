import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { WhatsappConversation, WhatsappMessage, WhatsappTemplate } from "./types";

export async function getWhatsappConversations(): Promise<WhatsappConversation[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .range(0, 4999);
  if (error) throw error;
  return (data ?? []) as WhatsappConversation[];
}

export async function getWhatsappMessages(conversationId: string): Promise<WhatsappMessage[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WhatsappMessage[];
}

export async function getWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.from("whatsapp_templates").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as WhatsappTemplate[];
}
