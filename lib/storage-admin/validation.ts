import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { StorageSettings } from "./types";

/**
 * Bloqueio de segurança fixo — nunca configurável pelo admin (diferente de
 * allowed_extensions, que é a lista do que É permitido além disso). Cobre
 * executáveis e scripts nas plataformas mais comuns (Windows/macOS/shell).
 */
export const DANGEROUS_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "msi", "msc", "scr", "cpl", "gadget",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "ps1xml", "psc1",
  "dll", "sh", "bash", "zsh", "jar", "app", "apk", "deb", "rpm", "reg",
];

export async function getStorageSettings(): Promise<StorageSettings> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storage_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error || !data) {
    throw new Error("storage_settings não encontrado — a migração de seed rodou?");
  }
  return data as StorageSettings;
}

function extensionOf(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type UploadValidation =
  | { ok: true; formato: string; hash: string }
  | { ok: false; message: string };

/**
 * Validação antes de aceitar upload (controle de armazenamento, requisito 2):
 * formato bloqueado por segurança, formato fora da lista permitida, tamanho
 * acima do limite. Duplicidade por hash é checada à parte (checkDuplicate)
 * porque não é bloqueio — é aviso com confirmação.
 */
export async function validateUpload(
  file: File,
  settings: StorageSettings,
): Promise<UploadValidation> {
  const formato = extensionOf(file.name);

  if (!formato) {
    return { ok: false, message: "O arquivo precisa ter uma extensão (ex.: .pdf)." };
  }
  if (DANGEROUS_EXTENSIONS.includes(formato)) {
    return {
      ok: false,
      message: `Arquivos ".${formato}" não são aceitos por segurança.`,
    };
  }
  if (!settings.allowed_extensions.includes(formato)) {
    return {
      ok: false,
      message: `Formato ".${formato}" não está na lista de formatos permitidos. Fale com um administrador se precisar enviar esse tipo de arquivo.`,
    };
  }
  if (file.size > settings.max_file_size_bytes) {
    const limiteMb = (settings.max_file_size_bytes / 1024 / 1024).toFixed(0);
    const tamanhoMb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      message: `Arquivo de ${tamanhoMb} MB acima do limite de ${limiteMb} MB.`,
    };
  }

  const hash = await hashFile(file);
  return { ok: true, formato, hash };
}

export type DuplicateMatch = {
  documentId: string;
  nome: string | null;
  storagePath: string;
  clienteNome: string | null;
  createdAt: string;
};

/** Documentos ativos com o mesmo hash — possível duplicidade (requisito 2). */
export async function findDuplicatesByHash(
  hash: string,
  excludeDocumentId?: string,
): Promise<DuplicateMatch[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("documents")
    .select("id, nome, storage_path, created_at, clients(nome)")
    .eq("hash_sha256", hash)
    .eq("arquivado", false)
    .limit(5);

  if (excludeDocumentId) {
    query = query.neq("id", excludeDocumentId);
  }

  const { data } = await query;
  return (data ?? []).map((d) => ({
    documentId: d.id,
    nome: d.nome,
    storagePath: d.storage_path,
    clienteNome: (d.clients as unknown as { nome: string } | null)?.nome ?? null,
    createdAt: d.created_at,
  }));
}
