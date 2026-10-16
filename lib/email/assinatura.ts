// HTML da assinatura de e-mail de cada pessoa da equipe (profiles.assinatura_*).
// Sem dependências do app: roda nos testes (tests/unit/email.test.mjs).
import { escaparHtml } from "./variaveis.ts";

export type DadosDaAssinatura = {
  url: string | null;
  fecho: string | null;
  whatsapp: string | null;
  instagram: string | null;
  nome: string;
};

const LINK = "color:#F27B20;text-decoration:none;font-weight:600;";

/**
 * Fecho + imagem da assinatura + links clicáveis (WhatsApp, Instagram).
 * Vazio quando a pessoa não configurou nada. Só aceita imagem https.
 */
export function htmlDaAssinatura(a: DadosDaAssinatura): string {
  const partes: string[] = [];
  if (a.fecho?.trim()) {
    partes.push(`<p style="margin:16px 0 8px;">${escaparHtml(a.fecho.trim())}</p>`);
  }
  if (a.url && /^https:\/\//.test(a.url)) {
    partes.push(
      `<img src="${escaparHtml(a.url)}" alt="${escaparHtml(a.nome)}" width="480" style="max-width:480px;width:100%;height:auto;border:0;display:block;" />`,
    );
  }
  const links: string[] = [];
  const zap = (a.whatsapp ?? "").replace(/\D/g, "");
  if (zap.length >= 8) links.push(`<a href="https://wa.me/${zap}" style="${LINK}">WhatsApp</a>`);
  const insta = (a.instagram ?? "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  if (insta) links.push(`<a href="https://instagram.com/${insta}" style="${LINK}">Instagram</a>`);
  if (links.length > 0) {
    partes.push(`<p style="margin:8px 0 0;font-size:13px;">${links.join(" &nbsp;·&nbsp; ")}</p>`);
  }
  return partes.join("");
}
