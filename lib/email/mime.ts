// Monta a mensagem de e-mail (RFC 822/MIME) que o Gmail recebe, com ou sem
// anexos. Sem dependências do app: roda nos testes (tests/unit/email.test.mjs).
import { randomUUID } from "node:crypto";

export type AnexoDoEmail = { nome: string; contentType: string; conteudo: Buffer };

/** Cabeçalho sem quebra de linha (evita injetar Bcc/To pelo assunto). */
function semQuebra(valor: string): string {
  return valor.replace(/[\r\n]+/g, " ").trim();
}

function assuntoCodificado(assunto: string): string {
  return `=?UTF-8?B?${Buffer.from(semQuebra(assunto), "utf-8").toString("base64")}?=`;
}

/** Base64 em linhas de 76 caracteres (limite do MIME). */
function base64EmLinhas(buf: Buffer): string {
  return (buf.toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

export function montarMensagem(m: { to: string; subject: string; html: string; anexos: AnexoDoEmail[] }): string {
  const cabecalho = [
    `To: ${semQuebra(m.to)}`,
    `Subject: ${assuntoCodificado(m.subject)}`,
    "MIME-Version: 1.0",
  ];
  const corpoHtml = base64EmLinhas(Buffer.from(m.html, "utf-8"));

  if (m.anexos.length === 0) {
    return [
      ...cabecalho,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      corpoHtml,
    ].join("\r\n");
  }

  const limite = `kmp-${randomUUID()}`;
  const linhas = [
    ...cabecalho,
    `Content-Type: multipart/mixed; boundary="${limite}"`,
    "",
    `--${limite}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    corpoHtml,
  ];
  for (const a of m.anexos) {
    const nome = semQuebra(a.nome).replaceAll('"', "");
    linhas.push(
      `--${limite}`,
      `Content-Type: ${semQuebra(a.contentType) || "application/octet-stream"}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "",
      base64EmLinhas(a.conteudo),
    );
  }
  linhas.push(`--${limite}--`, "");
  return linhas.join("\r\n");
}
