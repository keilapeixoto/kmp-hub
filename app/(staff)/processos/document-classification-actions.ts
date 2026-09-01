"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";
import { getStorageSettings, validateUpload, findDuplicatesByHash } from "@/lib/storage-admin/validation";
import { classifyDocument, type ClassificationCandidate } from "@/lib/documents/classification";
import { standardizedFilename } from "@/lib/documents/filename";
import {
  DOCUMENT_CLASSIFICATION_CONFIDENCE_THRESHOLD,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_TO_DEADLINE_REQUEST_TYPE,
} from "@/lib/documents/constants";
import { updateDeadlineStatus } from "../vencimentos/prazos/actions";

export type UploadClassifyResult = {
  ok: boolean;
  pendingReview: boolean;
  message: string;
};

/**
 * Se o documento virou de um tipo com pedido de 28 dias específico o
 * bastante pra casar com confiança (exame médico, skills assessment — ver
 * lib/documents/constants.ts), fecha automaticamente o prazo mais próximo
 * ainda aguardando documento e para os lembretes.
 */
async function autoCloseMatchingDeadline(caseId: string, documentType: string | null) {
  if (!documentType) return;
  const tipoPedido = DOCUMENT_TYPE_TO_DEADLINE_REQUEST_TYPE[documentType];
  if (!tipoPedido) return;

  const supabase = await createClient();
  const { data: deadline } = await supabase
    .from("case_deadlines")
    .select("id")
    .eq("case_id", caseId)
    .eq("tipo_pedido", tipoPedido)
    .eq("status", "aguardando_documento")
    .order("prazo_final", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (deadline) {
    await updateDeadlineStatus(deadline.id, "documento_recebido");
  }
}

async function markChecklistItemReceived(checklistItemId: string) {
  const supabase = await createClient();
  await supabase
    .from("checklist_items")
    .update({ status: "enviado" })
    .eq("id", checklistItemId)
    .neq("status", "aprovado");
}

/**
 * Upload com classificação automática (docs/spec-controle-documentos.md).
 * Chamada uma vez por arquivo pelo componente de arrastar-e-soltar — cada
 * chamada resolve de forma independente, então um arquivo ilegível não trava
 * os outros do lote.
 */
export async function uploadAndClassifyDocument(
  clientId: string,
  caseId: string,
  clienteNome: string,
  formData: FormData,
): Promise<UploadClassifyResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, pendingReview: false, message: "Selecione um arquivo." };
  }

  const settings = await getStorageSettings();
  const validation = await validateUpload(file, settings);
  if (!validation.ok) {
    return { ok: false, pendingReview: false, message: validation.message };
  }

  // Reenvio do mesmo arquivo (hash idêntico): nunca sobrescreve — segue
  // como documento adicional, só avisa no retorno (spec seção 6).
  const duplicates = await findDuplicatesByHash(validation.hash);
  const duplicateNote =
    duplicates.length > 0 ? " (arquivo idêntico a outro já existente — mantido como adicional)" : "";

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${clientId}/${caseId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { ok: false, pendingReview: false, message: "Falha ao enviar o arquivo. Tente de novo." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: checklistRow } = await supabase
    .from("checklists")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  let candidates: ClassificationCandidate[] = [];
  if (checklistRow) {
    const { data: itemRows } = await supabase
      .from("checklist_items")
      .select("id, nome, descricao")
      .eq("checklist_id", checklistRow.id)
      .is("parent_item_id", null)
      .neq("status", "aprovado");
    candidates = itemRows ?? [];
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const classification = await classifyDocument(buffer, file.type, candidates);

  const hoje = new Date().toISOString().slice(0, 10);
  const ext = safeName.includes(".") ? (safeName.split(".").pop() as string) : "pdf";

  let documentType: string | null = null;
  let confidence: number | null = null;
  let checklistItemId: string | null = null;
  let pendingReview = true;
  let nome = file.name;
  let message: string;

  if ("error" in classification) {
    message = `Arquivo salvo, mas a classificação automática falhou (${classification.error}) — revise o tipo manualmente.${duplicateNote}`;
  } else {
    documentType = classification.document_type;
    confidence = classification.confidence;
    const label = DOCUMENT_TYPE_LABELS[documentType] ?? documentType;

    if (confidence >= DOCUMENT_CLASSIFICATION_CONFIDENCE_THRESHOLD) {
      checklistItemId = classification.checklist_item_id;
      pendingReview = false;
      nome = standardizedFilename(clienteNome, documentType, hoje, ext);
      message = `Classificado como "${label}" (${Math.round(confidence * 100)}% de confiança)${duplicateNote}`;
    } else {
      message = `Confiança baixa (${Math.round(confidence * 100)}%) — sugestão: "${label}". Confirme o tipo na lista abaixo.${duplicateNote}`;
    }
  }

  const { data: inserted } = await supabase
    .from("documents")
    .insert({
      client_id: clientId,
      case_id: caseId,
      checklist_item_id: checklistItemId,
      storage_path: storagePath,
      enviado_por: user?.id ?? null,
      nome,
      nome_original: file.name,
      tamanho_bytes: file.size,
      formato: validation.formato,
      hash_sha256: validation.hash,
      document_type: documentType,
      classification_confidence: confidence,
      revisao_classificacao_pendente: pendingReview,
    })
    .select("id")
    .single();

  if (checklistItemId) {
    await markChecklistItemReceived(checklistItemId);
    await autoCloseMatchingDeadline(caseId, documentType);
  }

  revalidatePath(`/processos/${caseId}`);
  return { ok: Boolean(inserted), pendingReview, message };
}

/**
 * Confirmação manual do tipo quando a classificação automática ficou abaixo
 * do limite de confiança (ou falhou) — a equipe escolhe o tipo certo e,
 * opcionalmente, o item do checklist correspondente.
 */
export async function confirmDocumentClassification(documentId: string, caseId: string, formData: FormData) {
  const checklistItemIdInput = formData.get("checklist_item_id");
  const documentTypeInput = formData.get("document_type");
  const checklistItemId =
    typeof checklistItemIdInput === "string" && checklistItemIdInput ? checklistItemIdInput : null;
  const documentType =
    typeof documentTypeInput === "string" && documentTypeInput ? documentTypeInput : "outro";

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("nome_original, client_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) return;

  const { data: client } = await supabase
    .from("clients")
    .select("nome")
    .eq("id", doc.client_id)
    .maybeSingle();

  const nomeOriginal = doc.nome_original ?? "documento.pdf";
  const ext = nomeOriginal.includes(".") ? (nomeOriginal.split(".").pop() as string) : "pdf";
  const hoje = new Date().toISOString().slice(0, 10);

  await supabase
    .from("documents")
    .update({
      checklist_item_id: checklistItemId,
      document_type: documentType,
      revisao_classificacao_pendente: false,
      nome: standardizedFilename(client?.nome ?? "cliente", documentType, hoje, ext),
    })
    .eq("id", documentId);

  if (checklistItemId) {
    await markChecklistItemReceived(checklistItemId);
    await autoCloseMatchingDeadline(caseId, documentType);
  }

  revalidatePath(`/processos/${caseId}`);
}
