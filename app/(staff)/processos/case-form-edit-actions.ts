"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaseFormField } from "@/lib/case-forms/types";
import { linhasDeFormData, salvarRespostasEmBlocos } from "@/lib/case-forms/save";

function voltar(caseId: string, params: Record<string, string>): never {
  redirect(`/processos/${caseId}?${new URLSearchParams(params).toString()}`);
}

/**
 * A equipe corrige as respostas direto no card do processo. As permissões
 * são as do próprio formulário (RLS em case_forms/case_form_responses).
 */
export async function saveCaseFormByStaff(
  caseId: string,
  templateId: string,
  fields: CaseFormField[],
  formData: FormData,
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) voltar(caseId, { editErro: "Sessão expirada. Entre de novo." });

  const { data: existente } = await supabase
    .from("case_forms")
    .select("id")
    .eq("case_id", caseId)
    .eq("template_id", templateId)
    .maybeSingle();
  let caseFormId = existente?.id as string | undefined;
  if (!caseFormId) {
    const { data: criado, error } = await supabase
      .from("case_forms")
      .insert({ case_id: caseId, template_id: templateId, status: "em_preenchimento" })
      .select("id")
      .single();
    if (error || !criado) voltar(caseId, { editErro: "Sem permissão para editar este formulário." });
    caseFormId = criado.id as string;
  }

  const r = await salvarRespostasEmBlocos(supabase, linhasDeFormData(caseFormId, fields, formData));
  revalidatePath(`/processos/${caseId}`);
  if (r.erro) {
    voltar(caseId, {
      editErro: `${r.gravados} de ${r.total} campos foram gravados. Salve de novo para completar.`,
    });
  }
  voltar(caseId, { formSalvo: "1" });
}
