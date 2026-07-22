/**
 * Envio de e-mail via Resend (REST direto, sem SDK — evita mais uma
 * dependência só pra um POST). RESEND_API_KEY só existe no servidor
 * (variável sem prefixo NEXT_PUBLIC_), nunca chega ao navegador.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Precisa ser um domínio verificado no Resend (ver RESEND_FROM_EMAIL no .env.local).
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "KMP Hub <onboarding@resend.dev>";

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada" };
  }
  if (to.length === 0) {
    return { ok: false, error: "sem destinatário" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend respondeu ${res.status}` };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "falha de rede ao chamar o Resend" };
  }
}
