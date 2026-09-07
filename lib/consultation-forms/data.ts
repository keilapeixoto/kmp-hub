import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ConsultationForm } from "./types";

export async function getConsultationFormsByClient(
  clientId: string,
): Promise<ConsultationForm[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("consultation_forms")
    .select("*")
    .eq("client_id", clientId)
    .order("consult_date", { ascending: false });
  return (data ?? []) as ConsultationForm[];
}

export async function getConsultationForm(
  id: string,
): Promise<ConsultationForm | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("consultation_forms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as ConsultationForm | null;
}
