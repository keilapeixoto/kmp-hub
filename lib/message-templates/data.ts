import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type MessageTemplate = {
  id: string;
  nome: string;
  canal: "email" | "whatsapp" | "outro";
  idioma: "pt" | "en";
  corpo: string;
  created_at: string;
  updated_at: string;
};

export const CANAL_LABELS: Record<string, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("message_templates")
    .select("*")
    .order("nome");
  return (data ?? []) as MessageTemplate[];
}
