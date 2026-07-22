"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";
import { getStorageSettings, validateUpload, findDuplicatesByHash } from "@/lib/storage-admin/validation";
import { INITIAL_UPLOAD_STATE, type UploadDocumentState } from "@/lib/storage-admin/upload-state";

export async function createChecklistFromTemplate(
  caseId: string,
  templateId: string,
) {
  const supabase = await createClient();
  await supabase
    .from("checklists")
    .insert({ case_id: caseId, checklist_template_id: templateId });

  revalidatePath(`/processos/${caseId}`);
}

export async function updateChecklistItemStatus(
  caseId: string,
  itemId: string,
  formData: FormData,
) {
  const status = formData.get("status");
  const observacaoEquipe = formData.get("observacao_equipe");
  const motivoRejeicao = formData.get("motivo_rejeicao");

  if (typeof status !== "string" || !status.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("checklist_items")
    .update({
      status,
      observacao_equipe:
        typeof observacaoEquipe === "string" && observacaoEquipe.trim()
          ? observacaoEquipe.trim()
          : null,
      motivo_rejeicao:
        typeof motivoRejeicao === "string" && motivoRejeicao.trim()
          ? motivoRejeicao.trim()
          : null,
    })
    .eq("id", itemId);

  revalidatePath(`/processos/${caseId}`);
}

export async function uploadDocument(
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

  revalidatePath(`/processos/${caseId}`);
  return INITIAL_UPLOAD_STATE;
}

export async function addDocumentVersion(
  documentId: string,
  clientId: string,
  caseId: string,
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
    const duplicates = await findDuplicatesByHash(validation.hash, documentId);
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

  const { data: versions } = await supabase
    .from("document_versions")
    .select("versao")
    .eq("document_id", documentId)
    .order("versao", { ascending: false })
    .limit(1);

  const nextVersao = (versions?.[0]?.versao ?? 1) + 1;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("document_versions").insert({
    document_id: documentId,
    versao: nextVersao,
    storage_path: storagePath,
    autor: user?.id ?? null,
    tamanho_bytes: file.size,
    formato: validation.formato,
    hash_sha256: validation.hash,
  });

  await supabase
    .from("documents")
    .update({
      storage_path: storagePath,
      tamanho_bytes: file.size,
      formato: validation.formato,
      hash_sha256: validation.hash,
    })
    .eq("id", documentId);

  revalidatePath(`/processos/${caseId}`);
  return INITIAL_UPLOAD_STATE;
}

export async function renameDocument(
  documentId: string,
  caseId: string,
  formData: FormData,
) {
  const nome = formData.get("nome");
  if (typeof nome !== "string" || !nome.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ nome: nome.trim() })
    .eq("id", documentId);

  revalidatePath(`/processos/${caseId}`);
}

export async function archiveDocument(documentId: string, caseId: string) {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ arquivado: true })
    .eq("id", documentId);

  revalidatePath(`/processos/${caseId}`);
}
