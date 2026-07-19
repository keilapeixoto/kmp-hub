"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";

export type PortalLoginState = { error: string | null; sent: boolean };

export async function requestPortalMagicLink(
  _prevState: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Informe seu e-mail.", sent: false };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/portal` },
  });

  if (error) {
    return {
      error: "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      sent: false,
    };
  }

  return { error: null, sent: true };
}

export async function uploadPortalDocument(
  clientId: string,
  caseId: string,
  checklistItemId: string,
  formData: FormData,
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${clientId}/${caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("documents").insert({
    client_id: clientId,
    case_id: caseId,
    checklist_item_id: checklistItemId,
    storage_path: storagePath,
    enviado_por: user?.id ?? null,
  });

  revalidatePath("/portal/documentos");
}

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
