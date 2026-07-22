"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";
import { getStorageSettings, validateUpload, findDuplicatesByHash } from "@/lib/storage-admin/validation";
import { INITIAL_UPLOAD_STATE, type UploadDocumentState } from "@/lib/storage-admin/upload-state";

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
  _prevState: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo.", duplicates: null };
  }

  const settings = await getStorageSettings();
  const validation = await validateUpload(file, settings);
  if (!validation.ok) {
    return { error: validation.message, duplicates: null };
  }

  const confirmarDuplicata = formData.get("confirmar_duplicata") === "true";
  if (!confirmarDuplicata) {
    const duplicates = await findDuplicatesByHash(validation.hash);
    if (duplicates.length > 0) {
      return { error: null, duplicates };
    }
  }

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${clientId}/${caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: "Falha ao enviar o arquivo. Tente de novo.", duplicates: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const categoriaId = formData.get("categoria_id");

  await supabase.from("documents").insert({
    client_id: clientId,
    case_id: caseId,
    checklist_item_id: checklistItemId,
    storage_path: storagePath,
    enviado_por: user?.id ?? null,
    nome: file.name,
    tamanho_bytes: file.size,
    formato: validation.formato,
    hash_sha256: validation.hash,
    categoria_id: typeof categoriaId === "string" && categoriaId ? categoriaId : null,
  });

  revalidatePath("/portal/documentos");
  return INITIAL_UPLOAD_STATE;
}

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
