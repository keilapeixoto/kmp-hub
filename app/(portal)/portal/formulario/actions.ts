"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CaseFormField } from "@/lib/case-forms/types";
import { getEtapasComCampos } from "@/lib/case-forms/data";
import { camposPendentes } from "@/lib/case-forms/validate";
import { notifyFormSubmitted } from "@/lib/case-forms/notify-server";
import { linhasDeFormData, salvarRespostasEmBlocos } from "@/lib/case-forms/save";

// Status em que o cliente ainda pode mexer nas respostas (depois disso é a
// equipe que decide) — mesma regra das políticas case_forms_*_client.
const EDITAVEL = ["em_preenchimento", "enviado"];

/**
 * Gravação das respostas do portal.
 *
 * O acesso é provado com a sessão do cliente: o processo só aparece na
 * leitura se o RLS de `cases` liberar para ele. A gravação em si vai pelo
 * cliente admin — com a sessão do cliente, as políticas de
 * case_form_responses levavam ~5 s por linha e estouravam o tempo do banco
 * (57014), e o "Próximo" ficava parado (out/2026). O trigger
 * validate_case_form_response_field continua garantindo que cada campo é do
 * formulário deste processo.
 */
export async function saveFormStep(
  caseId: string,
  templateId: string,
  fields: CaseFormField[],
  currentStep: number,
  totalSteps: number,
  direction: "anterior" | "proximo" | "enviar",
  formData: FormData,
) {
  const base = `/portal/formulario?processo=${caseId}`;
  const supabase = await createClient();
  const { data: caso } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (!caso) redirect("/portal");

  const admin = createAdminClient();
  let { data: caseForm } = await admin
    .from("case_forms")
    .select("id, status")
    .eq("case_id", caseId)
    .eq("template_id", templateId)
    .maybeSingle();
  if (!caseForm) {
    const { data, error } = await admin
      .from("case_forms")
      .insert({ case_id: caseId, template_id: templateId, status: "em_preenchimento" })
      .select("id, status")
      .single();
    if (error) console.error("[saveFormStep] criar formulário falhou:", error.code, error.message);
    caseForm = data;
  }
  if (!caseForm) redirect(`${base}&etapa=${currentStep}&erro=1`);

  if (fields.length > 0 && EDITAVEL.includes(caseForm.status as string)) {
    const { erro } = await salvarRespostasEmBlocos(admin, linhasDeFormData(caseForm.id, fields, formData));
    if (erro) {
      console.error("[saveFormStep] gravar respostas falhou:", erro.code, erro.message);
      redirect(`${base}&etapa=${currentStep}&erro=1`);
    }
  }

  if (direction === "enviar") {
    // Obrigatórios só valem aqui: "Próximo" sempre avança e salva.
    const etapas = await getEtapasComCampos(templateId);
    const { data: linhas } = await admin
      .from("case_form_responses")
      .select("field_id, valor")
      .eq("case_form_id", caseForm.id);
    const respostas = Object.fromEntries((linhas ?? []).map((r) => [r.field_id, r.valor ?? ""]));
    const pendentes = camposPendentes(etapas, respostas);
    if (pendentes.length > 0) {
      revalidatePath("/portal/formulario");
      redirect(`${base}&etapa=${pendentes[0].etapa}&pendentes=${pendentes.length}`);
    }
    if (caseForm.status === "em_preenchimento") {
      await admin
        .from("case_forms")
        .update({ status: "enviado", enviado_em: new Date().toISOString() })
        .eq("id", caseForm.id);
      await notifyFormSubmitted(caseId);
    }
    revalidatePath("/portal");
    redirect(`${base}&enviado=1`);
  }

  const nextStep =
    direction === "anterior" ? Math.max(1, currentStep - 1) : Math.min(totalSteps, currentStep + 1);
  revalidatePath("/portal/formulario");
  redirect(`${base}&etapa=${nextStep}`);
}
