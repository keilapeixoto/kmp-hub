// Mensagem para o cliente quando o link de acesso do portal não sai. Antes
// tudo virava "Confira o e-mail", escondendo a causa real.
type ErroAuth = { status?: number; code?: string; message?: string };

export function mensagemErroLink(erro: ErroAuth): string {
  const texto = `${erro.code ?? ""} ${erro.message ?? ""}`.toLowerCase();
  if (erro.status === 429 || texto.includes("rate limit")) {
    return "Muitos pedidos de link em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (texto.includes("signups not allowed") || texto.includes("otp_disabled") || texto.includes("user not found")) {
    return "Este e-mail ainda não tem acesso ao portal. Fale com a sua consultora da KMP.";
  }
  if (texto.includes("sending") || texto.includes("smtp") || erro.status === 500) {
    return "O servidor de e-mail não conseguiu enviar o link agora. Tente de novo em instantes.";
  }
  if (texto.includes("invalid") || texto.includes("validate email")) {
    return "Confira o e-mail digitado e tente de novo.";
  }
  return "Não foi possível enviar o link. Tente de novo em instantes.";
}
