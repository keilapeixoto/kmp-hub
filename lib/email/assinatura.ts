// HTML da assinatura de e-mail de cada pessoa da equipe (profiles.assinatura_*).
// Sem dependências do app: roda nos testes (tests/unit/email.test.mjs).
import { escaparHtml } from "./variaveis.ts";

/** Assinatura em cartão (layout da KMP: foto, nome, cargo, contatos e botões). */
export type CartaoDaAssinatura = {
  cargo: string | null;
  credencial: string | null;
  slogan: string | null;
  telefone: string | null;
  email: string | null;
  fotoUrl: string | null;
  logoUrl: string | null;
  aviso: string | null;
  /** Endereço público do Hub, para os ícones (o e-mail precisa de URL completa). */
  baseUrl: string;
};

export type DadosDaAssinatura = {
  url: string | null;
  fecho: string | null;
  whatsapp: string | null;
  instagram: string | null;
  nome: string;
  cartao?: CartaoDaAssinatura | null;
};

const LINK = "color:#F27B20;text-decoration:none;font-weight:600;";

/**
 * Fecho + imagem da assinatura + links clicáveis (WhatsApp, Instagram).
 * Vazio quando a pessoa não configurou nada. Só aceita imagem https.
 */
export function htmlDaAssinatura(a: DadosDaAssinatura): string {
  if (a.cartao && temCartao(a.cartao)) return htmlDoCartao(a, a.cartao);
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

const LARANJA = "#F27B20";
const https = (u: string | null | undefined) => (u && /^https:\/\//.test(u) ? u : null);

function temCartao(c: CartaoDaAssinatura): boolean {
  return Boolean(c.cargo?.trim() || c.telefone?.trim() || c.email?.trim());
}

/**
 * Cartão em tabelas com estilo inline (o que Gmail e Outlook mostram bem).
 * Ícones em PNG (Gmail não mostra SVG). Tudo escapado; links só https/mailto/tel.
 */
function htmlDoCartao(a: DadosDaAssinatura, c: CartaoDaAssinatura): string {
  const e = escaparHtml;
  const fonte = "font-family:Arial,Helvetica,sans-serif;";
  const base = c.baseUrl.replace(/\/$/, "");
  const icone = (nome: string) =>
    `<img src="${e(`${base}/assinatura/${nome}.png`)}" width="18" height="18" alt="" style="display:block;border:0;" />`;
  const zap = (a.whatsapp ?? "").replace(/\D/g, "");
  const insta = (a.instagram ?? "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  const tel = (c.telefone ?? "").replace(/[^\d+]/g, "");
  const email = c.email?.trim() && /^[^\s@<>"]+@[^\s@<>"]+$/.test(c.email.trim()) ? c.email.trim() : null;

  const linha = (iconeNome: string, conteudo: string) =>
    `<tr><td style="padding:4px 10px 4px 0;vertical-align:middle;">${icone(iconeNome)}</td><td style="${fonte}font-size:13px;color:#1f1f1f;vertical-align:middle;">${conteudo}</td></tr>`;
  const contatos = [
    c.telefone?.trim() ? linha("telefone", `<a href="tel:${e(tel)}" style="color:#1f1f1f;text-decoration:none;">${e(c.telefone.trim())}</a>`) : "",
    email ? linha("email", `<a href="mailto:${e(email)}" style="color:#1f1f1f;text-decoration:none;">${e(email)}</a>`) : "",
    insta ? linha("instagram", `<a href="https://instagram.com/${e(insta)}" style="color:#1f1f1f;text-decoration:none;">@${e(insta)}</a>`) : "",
  ].join("");
  const botao = (rotulo: string, href: string) =>
    `<a href="${e(href)}" style="${fonte}display:inline-block;padding:6px 18px;margin:8px 8px 0 0;border:1.5px solid ${LARANJA};border-radius:16px;color:${LARANJA};font-size:13px;font-weight:bold;text-decoration:none;">${e(rotulo)}</a>`;
  const botoes = [insta ? botao("Instagram", `https://instagram.com/${insta}`) : "", zap.length >= 8 ? botao("WhatsApp", `https://wa.me/${zap}`) : ""].join("");

  const foto = https(c.fotoUrl)
    ? `<td width="136" style="width:136px;min-width:136px;padding:0 20px 0 0;vertical-align:middle;"><img src="${e(https(c.fotoUrl)!)}" width="110" height="110" alt="${e(a.nome)}" style="display:block;width:110px;min-width:110px;max-width:110px;height:110px;border-radius:55px;border:3px solid ${LARANJA};" /></td>`
    : "";
  const logo = https(c.logoUrl)
    ? `<img src="${e(https(c.logoUrl)!)}" width="170" alt="" style="display:block;width:170px;height:auto;border:0;margin:0 0 8px;" />`
    : "";

  const fecho = a.fecho?.trim() ? `<p style="${fonte}margin:16px 0 8px;font-size:14px;color:#1f1f1f;">${e(a.fecho.trim())}</p>` : "";
  return `${fecho}<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:12px;max-width:640px;">
<tr>
${foto}<td style="padding:0 18px 0 0;vertical-align:middle;border-right:2px solid ${LARANJA};">
<p style="${fonte}margin:0;font-size:22px;font-weight:bold;color:#1f1f1f;">${e(a.nome)}</p>
${c.cargo?.trim() ? `<p style="${fonte}margin:4px 0 0;font-size:14px;color:${LARANJA};">${e(c.cargo.trim())}</p>` : ""}
${c.credencial?.trim() ? `<p style="${fonte}margin:4px 0 0;font-size:12px;color:#555555;">${e(c.credencial.trim())}</p>` : ""}
${c.slogan?.trim() ? `<p style="${fonte}margin:12px 0 0;font-size:12px;font-weight:bold;letter-spacing:0.3px;color:${LARANJA};text-transform:uppercase;">${e(c.slogan.trim())}</p>` : ""}
</td>
<td style="padding:0 0 0 18px;vertical-align:middle;">
${logo}<table cellpadding="0" cellspacing="0" border="0" role="presentation">${contatos}</table>
${botoes}
</td>
</tr>
${c.aviso?.trim() ? `<tr><td colspan="${foto ? 3 : 2}" style="height:14px;line-height:14px;font-size:1px;">&nbsp;</td></tr><tr><td colspan="${foto ? 3 : 2}" style="${fonte}padding:12px 0 0;border-top:1px solid #e5e5e5;font-size:11px;color:#777777;">${e(c.aviso.trim())}</td></tr>` : ""}
</table>`;
}
