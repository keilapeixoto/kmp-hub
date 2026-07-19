import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { Document } from "./types";

export const DOCUMENTS_BUCKET = "documents";

/** Curta duração (seção 1 do plano: "acesso somente por URLs assinadas de curta duração"). */
const SIGNED_URL_EXPIRY_SECONDS = 300;

export async function getDocumentsByClient(clientId: string): Promise<Document[]> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("categoria")
    .order("storage_path");
  return (data ?? []) as Document[];
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

export async function getSignedDocumentUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createSupabaseClient();
  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  return data?.signedUrl ?? null;
}
