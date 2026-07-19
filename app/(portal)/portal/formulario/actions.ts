"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaseFormField } from "@/lib/case-forms/types";

async function ensureCaseForm(caseId: string, templateId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("case_forms")
    .select("id")
    .eq("case_id", caseId)
    .eq("template_id", templateId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("case_forms")
    .insert({ case_id: caseId, template_id: templateId, status: "em_preenchimento" })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

export async function saveFormStep(
  caseId: string,
  templateId: string,
  fields: CaseFormField[],
  currentStep: number,
  totalSteps: number,
  direction: "anterior" | "proximo" | "enviar",
  formData: FormData,
) {
  const supabase = await createClient();
  const caseFormId = await ensureCaseForm(caseId, templateId);
  if (!caseFormId) return;

  if (fields.length > 0) {
    const rows = fields.map((field) => {
      const raw = formData.get(field.id);
      const valor = typeof raw === "string" && raw.trim() ? raw.trim() : null;
      return { case_form_id: caseFormId, field_id: field.id, valor };
    });
    await supabase
      .from("case_form_responses")
      .upsert(rows, { onConflict: "case_form_id,field_id" });
  }

  if (direction === "enviar") {
    await supabase
      .from("case_forms")
      .update({ status: "enviado", enviado_em: new Date().toISOString() })
      .eq("id", caseFormId);
    revalidatePath("/portal");
    redirect(`/portal/formulario?processo=${caseId}&enviado=1`);
  }

  const nextStep =
    direction === "anterior" ? Math.max(1, currentStep - 1) : Math.min(totalSteps, currentStep + 1);
  revalidatePath("/portal/formulario");
  redirect(`/portal/formulario?processo=${caseId}&etapa=${nextStep}`);
}
