"use server";

import { portalUrl } from "@/lib/dominios";
import { mensagemErroLink } from "@/lib/portal/erro-link";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";
import { getStorageSettings, validateUpload, findDuplicatesByHash } from "@/lib/storage-admin/validation";
import { INITIAL_UPLOAD_STATE, type UploadDocumentState } from "@/lib/storage-admin/upload-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusDepoisDoEnvio } from "@/lib/portal/progresso";

export type PortalLoginState = { error: string | null; sent: boolean };

export async function requestPortalMagicLink(
  _prevState: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Informe seu e-mail.", sent: false };
  }

  // Cliente sem cookies e com fluxo "implicit": o link sai com um token que
  // vale em qualquer aparelho (o fluxo PKCE do cliente com cookies gerava
  // "pkce_..." e só funcionava no mesmo navegador em que foi pedido).
  const supabase = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );
  const siteUrl = portalUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/portal` },
  });

  if (error) {
    // código e mensagem do Supabase (sem o e-mail digitado)
    console.error("[requestPortalMagicLink] falhou:", error.status, error.code, error.message);
    return { error: mensagemErroLink(error), sent: false };
  }

  return { error: null, sent: true };
}

export async function uploadPortalDocument(
  clientId: string,
  caseId: string,
  checklistItemId: string | null,
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

  const { error: insertError } = await supabase.from("documents").insert({
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

  if (insertError) {
    console.error("[uploadPortalDocument] registro falhou:", insertError.code, insertError.message);
    return { error: "O arquivo subiu, mas não conseguimos registrá-lo. Tente de novo.", duplicates: null };
  }

  // O registro acima passou pelo RLS do cliente (prova que o processo é dele).
  // O item do checklist muda de status para a equipe ver que chegou — o
  // cliente não tem UPDATE em checklist_items, então vai pelo admin, só para
  // um item deste mesmo processo.
  if (checklistItemId) await marcarItemComoEnviado(caseId, checklistItemId);

  revalidatePath("/portal/documentos");
  revalidatePath("/portal");
  return INITIAL_UPLOAD_STATE;
}

async function marcarItemComoEnviado(caseId: string, checklistItemId: string) {
  const admin = createAdminClient();
  const { data: item } = await admin
    .from("checklist_items")
    .select("id, status, checklists!inner(case_id)")
    .eq("id", checklistItemId)
    .eq("checklists.case_id", caseId)
    .maybeSingle();
  if (!item) return;
  const novo = statusDepoisDoEnvio(item.status as string);
  if (novo) await admin.from("checklist_items").update({ status: novo }).eq("id", item.id);
}

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
