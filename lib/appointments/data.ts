import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Appointment, AppointmentSummary } from "./types";

export async function getAppointments(): Promise<Appointment[]> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("inicio", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Appointment | null;
}

export async function getAppointmentSummary(
  appointmentId: string,
): Promise<AppointmentSummary | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("appointment_summaries")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  return data as AppointmentSummary | null;
}

/** ids de compromissos que já têm resumo — para o alerta "resumo pendente". */
export async function getSummarizedAppointmentIds(): Promise<Set<string>> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("appointment_summaries")
    .select("appointment_id");
  return new Set((data ?? []).map((r) => r.appointment_id));
}
