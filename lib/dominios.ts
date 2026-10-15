// Endereços do Hub (out/2026): um para a equipe e outro para os clientes,
// apontando para o mesmo sistema. Sem dependências: roda no middleware e nos
// testes.

/** Endereço da equipe (CRM). */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

/**
 * Endereço que vai nos links para clientes (portal). O login do cliente fica
 * gravado no endereço em que ele entrou, então o link do e-mail precisa ser o
 * mesmo do portal.
 */
export function portalUrl(): string {
  return process.env.NEXT_PUBLIC_PORTAL_URL ?? siteUrl();
}

const PASSAM_DIRETO = ["/portal", "/auth/", "/api/", "/_next/"];

/**
 * No endereço do cliente (clientportal.*), só o portal fica acessível: a raiz
 * e qualquer tela da equipe vão para o portal. Devolve o caminho de destino,
 * ou null se a requisição segue normalmente.
 */
export function redirecionarPortal(host: string | null, caminho: string): string | null {
  if (!host || !host.toLowerCase().startsWith("clientportal.")) return null;
  if (PASSAM_DIRETO.some((p) => caminho === p || caminho.startsWith(p.endsWith("/") ? p : `${p}/`) || caminho === p.replace(/\/$/, ""))) {
    return null;
  }
  if (/\.[a-z0-9]+$/i.test(caminho)) return null; // arquivos (logo, ícones)
  return caminho === "/login" ? "/portal/login" : "/portal";
}
