import { createAdminClient } from "@/lib/supabase/admin";
import { getStorageSettings } from "@/lib/storage-admin/validation";
import { caminhoDoProcesso, extensao, nomeComDescricao, problemaDoArquivo, type ArquivoEnviado } from "@/lib/portal/arquivos";
import { DOCUMENTS_BUCKET } from "./data";

export type ArquivoConferido = {
  storage_path: string;
  nome: string;
  tamanho_bytes: number;
  formato: string;
  hash_sha256: string | null;
};

/**
 * Confere arquivos que o navegador já subiu direto para o Storage antes de
 * registrar em `documents`: pasta certa (cliente/processo), formato e tamanho
 * reais lidos do Storage (não do navegador). Arquivo recusado é apagado do
 * Storage na hora. Só servidor (usa a secret key para ler os metadados).
 */
export async function conferirArquivosEnviados(
  clientId: string,
  pastaProcesso: string,
  arquivos: ArquivoEnviado[],
  descricao: string | null = null,
): Promise<{ ok: true; arquivos: ArquivoConferido[] } | { ok: false; error: string }> {
  if (arquivos.length === 0) return { ok: false, error: "Selecione um arquivo." };
  const settings = await getStorageSettings();
  const regras = { extensoes: settings.allowed_extensions, maxBytes: settings.max_file_size_bytes };
  const admin = createAdminClient();

  const conferidos: ArquivoConferido[] = [];
  for (const a of arquivos) {
    if (!caminhoDoProcesso(a.caminho, clientId, pastaProcesso)) {
      return { ok: false, error: "Arquivo fora da pasta deste cliente." };
    }
    const corte = a.caminho.lastIndexOf("/");
    const pasta = a.caminho.slice(0, corte);
    const arquivo = a.caminho.slice(corte + 1);
    const { data: lista } = await admin.storage.from(DOCUMENTS_BUCKET).list(pasta, { search: arquivo, limit: 1 });
    const obj = (lista ?? []).find((o) => o.name === arquivo);
    if (!obj) return { ok: false, error: `${a.nome}: o arquivo não chegou. Tente de novo.` };
    const tamanho = Number((obj.metadata as { size?: number } | undefined)?.size ?? 0);
    const problema = problemaDoArquivo({ nome: a.nome, tamanho }, regras);
    if (problema) {
      await admin.storage.from(DOCUMENTS_BUCKET).remove([a.caminho]);
      return { ok: false, error: problema };
    }
    conferidos.push({
      storage_path: a.caminho,
      nome: nomeComDescricao(a.nome, descricao),
      tamanho_bytes: tamanho,
      formato: extensao(a.nome),
      hash_sha256: a.hash,
    });
  }
  return { ok: true, arquivos: conferidos };
}

