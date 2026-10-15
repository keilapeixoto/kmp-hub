// Aviso à equipe quando o cliente envia o formulário. Sem imports com alias
// (testável); a ligação com Supabase e Resend fica em notify-server.ts.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSubmittedEmail({ clienteNome, link }: { clienteNome: string; link: string }) {
  const nomeLinha = clienteNome.replace(/[\r\n]+/g, " ").trim();
  return {
    subject: `Formulário enviado: ${nomeLinha}`,
    html: `<p>O cliente <strong>${escapeHtml(nomeLinha)}</strong> enviou o formulário de dados.</p><p><a href="${escapeHtml(link)}">Abrir o processo no Hub</a></p>`,
  };
}

export type DepsAviso = {
  buscarDestino: (caseId: string) => Promise<{ email: string | null; clienteNome: string } | null>;
  enviar: (to: string[], subject: string, html: string) => Promise<{ ok: boolean; error: string | null }>;
  siteUrl: string;
};

/** Nunca lança: o envio do formulário pelo cliente não pode depender do e-mail. */
export async function avisarEnvio(deps: DepsAviso, caseId: string): Promise<void> {
  try {
    const destino = await deps.buscarDestino(caseId);
    if (!destino?.email) return;
    const { subject, html } = buildSubmittedEmail({
      clienteNome: destino.clienteNome,
      link: `${deps.siteUrl}/processos/${caseId}`,
    });
    const r = await deps.enviar([destino.email], subject, html);
    if (!r.ok) console.error("[avisarEnvio] e-mail não enviado:", r.error);
  } catch (e) {
    console.error("[avisarEnvio] falhou:", e instanceof Error ? e.message : "erro desconhecido");
  }
}

export function buildDocumentEmail({
  clienteNome,
  documento,
  link,
}: {
  clienteNome: string;
  documento: string;
  link: string;
}) {
  const nomeLinha = clienteNome.replace(/[\r\n]+/g, " ").trim();
  const docLinha = documento.replace(/[\r\n]+/g, " ").trim();
  return {
    subject: `Documento enviado pelo portal: ${nomeLinha}`,
    html: `<p>O cliente <strong>${escapeHtml(nomeLinha)}</strong> enviou um documento pelo portal: <strong>${escapeHtml(docLinha)}</strong>.</p><p><a href="${escapeHtml(link)}">Abrir o processo no Hub</a></p>`,
  };
}

/** Aviso de documento enviado pelo portal. Nunca lança: o envio do arquivo não depende do e-mail. */
export async function avisarDocumento(deps: DepsAviso, caseId: string, documento: string): Promise<void> {
  try {
    const destino = await deps.buscarDestino(caseId);
    if (!destino?.email) return;
    const { subject, html } = buildDocumentEmail({
      clienteNome: destino.clienteNome,
      documento,
      link: `${deps.siteUrl}/processos/${caseId}`,
    });
    const r = await deps.enviar([destino.email], subject, html);
    if (!r.ok) console.error("[avisarDocumento] e-mail não enviado:", r.error);
  } catch (e) {
    console.error("[avisarDocumento] falhou:", e instanceof Error ? e.message : "erro desconhecido");
  }
}
