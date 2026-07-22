"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsFormState = { error: string | null; saved: boolean };

function parseList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function parseIntList(value: FormDataEntryValue | null): number[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0 && n <= 100)
    .sort((a, b) => a - b);
}

export async function updateStorageSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const maxFileSizeMb = parseFloat(String(formData.get("max_file_size_mb")));
  const internalLimitGb = parseFloat(String(formData.get("internal_limit_gb")));
  const largeFileWarningMb = parseFloat(
    String(formData.get("large_file_warning_mb")),
  );
  const archivedReviewDays = parseInt(
    String(formData.get("archived_case_review_days")),
    10,
  );

  if (
    Number.isNaN(maxFileSizeMb) ||
    maxFileSizeMb <= 0 ||
    Number.isNaN(internalLimitGb) ||
    internalLimitGb <= 0 ||
    Number.isNaN(largeFileWarningMb) ||
    largeFileWarningMb <= 0 ||
    Number.isNaN(archivedReviewDays) ||
    archivedReviewDays <= 0
  ) {
    return { error: "Todos os valores numéricos precisam ser maiores que zero.", saved: false };
  }

  const allowedExtensions = parseList(formData.get("allowed_extensions"));
  const alertThresholds = parseIntList(formData.get("alert_thresholds_pct"));
  const alertEmails = parseList(formData.get("alert_emails"));

  if (allowedExtensions.length === 0) {
    return { error: "Informe pelo menos um formato permitido.", saved: false };
  }
  if (alertThresholds.length === 0) {
    return { error: "Informe pelo menos um nível de alerta (%).", saved: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("storage_settings")
    .update({
      max_file_size_bytes: Math.round(maxFileSizeMb * 1024 * 1024),
      internal_limit_bytes: Math.round(internalLimitGb * 1024 * 1024 * 1024),
      large_file_warning_bytes: Math.round(largeFileWarningMb * 1024 * 1024),
      archived_case_review_days: archivedReviewDays,
      allowed_extensions: allowedExtensions,
      alert_thresholds_pct: alertThresholds,
      alert_emails: alertEmails,
      updated_by: user?.id ?? null,
    })
    .eq("id", true);

  if (error) {
    return { error: "Não foi possível salvar. Tente de novo.", saved: false };
  }

  revalidatePath("/configuracoes/armazenamento/ajustes");
  revalidatePath("/configuracoes/armazenamento");
  return { error: null, saved: true };
}
