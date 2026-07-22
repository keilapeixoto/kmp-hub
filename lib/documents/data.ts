import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Document, DocumentCategory } from "./types";

export const DOCUMENTS_BUCKET = "documents";

/** Curta duração (seção 1 do plano: "acesso somente por URLs assinadas de curta duração"). */
const SIGNED_URL_EXPIRY_SECONDS = 300;

export type DocumentWithCategoryName = Document & {
  categoria_nome: string | null;
};

export async function getDocumentsByClient(
  clientId: string,
): Promise<DocumentWithCategoryName[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*, document_categories(nome)")
    .eq("client_id", clientId)
    .order("storage_path");
  return (data ?? []).map((d) => ({
    ...d,
    categoria_nome:
      (d.document_categories as unknown as { nome: string } | null)?.nome ?? null,
  })) as DocumentWithCategoryName[];
}

export async function getDocumentsByCase(caseId: string): Promise<Document[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Document[];
}

export async function getDocumentsByChecklistItem(
  checklistItemId: string,
): Promise<Document[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("checklist_item_id", checklistItemId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Document[];
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("document_categories")
    .select("id, nome, sensivel, ordem")
    .order("ordem");
  return (data ?? []) as DocumentCategory[];
}

export async function getSignedDocumentUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  return data?.signedUrl ?? null;
}
