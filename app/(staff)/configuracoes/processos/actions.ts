"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CASE_STATUSES } from "@/lib/cases/constants";

export type CaseStatusLabelsFormState = { error: string | null; saved: boolean };

export async function updateCaseStatusLabels(
  _prevState: CaseStatusLabelsFormState,
  formData: FormData,
): Promise<CaseStatusLabelsFormState> {
  const labelsBySlug = new Map<string, string>();
  for (const status of CASE_STATUSES) {
    const label = String(formData.get(`label_${status.slug}`) ?? "").trim();
    if (!label) {
      return { error: `Informe um nome para "${status.label}".`, saved: false };
    }
    labelsBySlug.set(status.slug, label);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const [statusSlug, label] of labelsBySlug) {
    const { error } = await supabase
      .from("case_status_labels")
      .update({ label, updated_by: user?.id ?? null })
      .eq("status_slug", statusSlug);

    if (error) {
      return { error: "Não foi possível salvar. Tente de novo.", saved: false };
    }
  }

  revalidatePath("/configuracoes/processos");
  revalidatePath("/processos");
  return { error: null, saved: true };
}
