"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { zonedTimeToUtc } from "@/lib/appointments/timezones";

export type AppointmentFormState = {
  error: string | null;
};

function readDateTime(
  formData: FormData,
  field: string,
  timeZone: string,
): string | null {
  const value = formData.get(field);
  if (typeof value !== "string" || !value.trim()) return null;
  return zonedTimeToUtc(value.trim(), timeZone).toISOString();
}

export async function createAppointment(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const titulo = formData.get("titulo");
  const timeZone =
    (formData.get("fuso_entrada") as string | null) ?? "Australia/Sydney";

  if (typeof titulo !== "string" || !titulo.trim()) {
    return { error: "Informe o título do compromisso." };
  }

  const inicio = readDateTime(formData, "inicio", timeZone);
  if (!inicio) {
    return { error: "Informe a data e hora de início." };
  }

  const insertData: Record<string, unknown> = {
    titulo: titulo.trim(),
    inicio,
    fim: readDateTime(formData, "fim", timeZone),
  };

  for (const field of ["tipo", "client_id", "lead_id", "case_id"]) {
    const value = formData.get(field);
    if (typeof value === "string" && value.trim()) insertData[field] = value.trim();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o compromisso." };
  }

  revalidatePath("/agenda");
  redirect(`/agenda/${data.id}`);
}

export async function saveAppointmentSummary(
  appointmentId: string,
  formData: FormData,
) {
  const resumo = formData.get("resumo");
  if (typeof resumo !== "string" || !resumo.trim()) return;

  const fields: Record<string, string | null> = { resumo: resumo.trim() };
  for (const key of [
    "decisoes",
    "riscos",
    "documentos_solicitados",
    "proximos_passos",
    "proximo_acompanhamento",
  ]) {
    const value = formData.get(key);
    fields[key] =
      typeof value === "string" && value.trim() ? value.trim() : null;
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("appointment_summaries")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("appointment_summaries")
      .update(fields)
      .eq("id", existing.id);
  } else {
    await supabase
      .from("appointment_summaries")
      .insert({ appointment_id: appointmentId, ...fields });
  }

  revalidatePath(`/agenda/${appointmentId}`);
  revalidatePath("/agenda");
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", id);
  revalidatePath("/agenda");
  redirect("/agenda");
}
