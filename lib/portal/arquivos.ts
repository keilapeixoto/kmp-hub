// Regras do envio de arquivos (portal e Hub) (sem dependências além dos
// textos do portal: roda no navegador, no servidor e nos testes).

import { traduzir, type Idioma } from "./i18n.ts";

/** Mesma lista fixa de lib/storage-admin/validation.ts (executáveis/scripts). */
const PERIGOSAS = [
  "exe", "bat", "cmd", "com", "msi", "msc", "scr", "cpl", "gadget",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "ps1xml", "psc1",
  "dll", "sh", "bash", "zsh", "jar", "app", "apk", "deb", "rpm", "reg",
];

export function extensao(nome: string): string {
  const partes = nome.split(".");
  return partes.length > 1 ? (partes.pop() ?? "").toLowerCase() : "";
}

/** Motivo de recusa do arquivo, ou null se pode enviar. */
export function problemaDoArquivo(
  arquivo: { nome: string; tamanho: number },
  regras: { extensoes: string[]; maxBytes: number },
  idioma: Idioma = "pt",
): string | null {
  const ext = extensao(arquivo.nome);
  const nome = arquivo.nome;
  if (!ext) return traduzir(idioma, "arquivo.semExtensao", { nome });
  if (PERIGOSAS.includes(ext) || !regras.extensoes.includes(ext)) return traduzir(idioma, "arquivo.formato", { nome, ext });
  if (arquivo.tamanho > regras.maxBytes)
    return traduzir(idioma, "arquivo.grande", { nome, mb: Math.round(regras.maxBytes / 1024 / 1024) });
  if (arquivo.tamanho === 0) return traduzir(idioma, "arquivo.vazio", { nome });
  return null;
}

/** Caminho no bucket: cliente/processo/data-nome (mesma regra do RLS do Storage). */
export function caminhoNoBucket(clientId: string, caseId: string, nome: string, agora = Date.now()): string {
  const seguro = nome.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `${clientId}/${caseId}/${agora}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
}

/** O caminho informado pelo navegador é mesmo da pasta deste processo? */
export function caminhoDoProcesso(caminho: string, clientId: string, caseId: string): boolean {
  const prefixo = `${clientId}/${caseId}/`;
  return caminho.startsWith(prefixo) && !caminho.slice(prefixo.length).includes("/") && !caminho.includes("..");
}

/** Texto de ajuda: "PDF, JPG, PNG · até 25 MB por arquivo · vários arquivos". */
export function textoDeFormatos(regras: { extensoes: string[]; maxBytes: number }, idioma: Idioma = "pt"): string {
  const principais = ["pdf", "jpg", "jpeg", "png", "heic", "doc", "docx"].filter((e) => regras.extensoes.includes(e));
  const lista = (principais.length ? principais : regras.extensoes.slice(0, 5)).filter((e) => e !== "jpeg");
  return traduzir(idioma, "upload.formatos", {
    lista: lista.map((e) => e.toUpperCase()).join(", "),
    mb: Math.round(regras.maxBytes / 1024 / 1024),
  });
}

export type ArquivoEnviado = { caminho: string; nome: string; hash: string | null };
export type RegistroState = { error: string | null; enviados: number };

/** "Escritura da casa (foto123.jpg)" — o que o cliente escreveu + o arquivo original. */
export function nomeComDescricao(nome: string, descricao: string | null): string {
  const d = (descricao ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  return d ? `${d} (${nome})` : nome;
}
