import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { MessageTemplate } from "./constants";

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("message_templates")
    .select("*")
    .order("nome");
  return (data ?? []) as MessageTemplate[];
}
