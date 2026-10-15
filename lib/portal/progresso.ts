// Contas do resumo do portal (sem dependências: roda nos testes).

/** Status de item do checklist em que a bola está com o cliente. */
export const STATUS_COM_O_CLIENTE = ["solicitado", "aguardando_cliente", "rejeitado", "reenvio_solicitado"];

export function itensPendentesDoCliente<T extends { status: string }>(itens: T[]): T[] {
  return itens.filter((i) => STATUS_COM_O_CLIENTE.includes(i.status));
}

/** Percentual de campos do formulário com resposta (0–100, inteiro). */
export function percentualPreenchido(
  campos: string[],
  respostas: { field_id: string; valor: string | null }[],
): number {
  if (campos.length === 0) return 0;
  const preenchidos = new Set(respostas.filter((r) => (r.valor ?? "").trim()).map((r) => r.field_id));
  const n = campos.filter((id) => preenchidos.has(id)).length;
  return Math.round((n / campos.length) * 100);
}

/** Link de WhatsApp a partir do telefone cadastrado (só dígitos; null se não der). */
export function linkWhatsapp(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : null;
}

/**
 * Status do item do checklist depois que o cliente envia um arquivo pelo
 * portal. null = não mexe (já está com a equipe ou aprovado).
 */
export function statusDepoisDoEnvio(atual: string): string | null {
  if (atual === "rejeitado" || atual === "reenvio_solicitado") return "reenviado";
  if (atual === "nao_solicitado" || atual === "solicitado" || atual === "aguardando_cliente") return "enviado";
  return null;
}
