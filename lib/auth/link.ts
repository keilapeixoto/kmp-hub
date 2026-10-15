// Regras do link de acesso por e-mail (portal e convites). Sem dependências.

/** Destino depois do login: só caminhos internos; o resto vai para o portal. */
export function destinoSeguro(next: string | null, padrao = "/portal"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return padrao;
  return next;
}

const TIPOS = ["email", "magiclink", "invite", "signup", "recovery", "email_change"] as const;
export type TipoLink = (typeof TIPOS)[number];

export function tipoDoLink(tipo: string | null): TipoLink | null {
  return tipo && (TIPOS as readonly string[]).includes(tipo) ? (tipo as TipoLink) : null;
}
