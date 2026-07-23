import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type {
  CaseForm,
  CaseFormField,
  CaseFormStep,
  CaseFormTemplate,
  CaseFormView,
} from "./types";

export async function getCaseFormTemplates(): Promise<
  (CaseFormTemplate & {
    service_type_nome: string | null;
    etapas_count: number;
    campos_count: number;
  })[]
> {
  const supabase = await createSupabaseClient();
  const { data: templates } = await supabase
    .from("case_form_templates")
    .select(
      "*, service_types!case_form_templates_service_type_id_fkey(nome), case_form_steps(id, case_form_fields(count))",
    )
    .order("nome");

  return (templates ?? []).map((t) => {
    const steps =
      (t as { case_form_steps?: { id: string; case_form_fields?: { count: number }[] }[] })
        .case_form_steps ?? [];
    const camposCount = steps.reduce(
      (sum, s) => sum + (s.case_form_fields?.[0]?.count ?? 0),
      0,
    );
    return {
      ...t,
      service_type_nome:
        (t as { service_types?: { nome: string } | null }).service_types?.nome ?? null,
      etapas_count: steps.length,
      campos_count: camposCount,
    };
  }) as (CaseFormTemplate & {
    service_type_nome: string | null;
    etapas_count: number;
    campos_count: number;
  })[];
}

export async function getCaseFormTemplateForCase(
  caseId: string,
): Promise<CaseFormTemplate | null> {
  const supabase = await createSupabaseClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("service_type_id")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const { data: serviceType } = await supabase
    .from("service_types")
    .select("case_form_template_id")
    .eq("id", caseRow.service_type_id)
    .maybeSingle();
  if (!serviceType?.case_form_template_id) return null;

  const { data: template } = await supabase
    .from("case_form_templates")
    .select("*")
    .eq("id", serviceType.case_form_template_id)
    .maybeSingle();
  return template as CaseFormTemplate | null;
}

export async function getCaseFormSteps(templateId: string): Promise<CaseFormStep[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_form_steps")
    .select("*")
    .eq("template_id", templateId)
    .order("ordem");
  return (data ?? []) as CaseFormStep[];
}

export async function getCaseFormFields(stepId: string): Promise<CaseFormField[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_form_fields")
    .select("*")
    .eq("step_id", stepId)
    .order("ordem");
  return (data ?? []) as CaseFormField[];
}

export async function getCaseForm(
  caseId: string,
  templateId: string,
): Promise<CaseForm | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_forms")
    .select("*")
    .eq("case_id", caseId)
    .eq("template_id", templateId)
    .maybeSingle();
  return data as CaseForm | null;
}

export async function getCaseFormResponses(
  caseFormId: string,
): Promise<Record<string, string>> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_form_responses")
    .select("field_id, valor")
    .eq("case_form_id", caseFormId);

  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    if (r.valor !== null) map[r.field_id] = r.valor;
  }
  return map;
}

export async function getCaseFormView(
  caseId: string,
  templateId: string,
): Promise<CaseFormView | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("case_form_views")
    .select("*")
    .eq("case_id", caseId)
    .eq("template_id", templateId)
    .maybeSingle();
  return data as CaseFormView | null;
}

/** Chamado pela página do formulário no portal — grava só na primeira vez (controle de formulários). */
export async function markCaseFormViewed(
  caseId: string,
  templateId: string,
): Promise<void> {
  const supabase = await createSupabaseClient();
  await supabase
    .from("case_form_views")
    .insert({ case_id: caseId, template_id: templateId })
    .select()
    .maybeSingle();
}
