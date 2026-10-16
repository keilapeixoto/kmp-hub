// Texto dos e-mails de alerta ao cliente (pedido novo, documento recusado,
// formulário reaberto). Sem imports com alias: testável em
// tests/unit/avisos-cliente.test.mjs. O envio fica em avisos-cliente-server.ts.

export type AvisoAoCliente =
  | { tipo: "pedido"; itens: { nome: string; instrucoes: string | null; prazo: string | null }[] }
  | { tipo: "recusa"; documento: string; motivo: string }
  | { tipo: "formulario"; motivo: string };

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** "2026-10-24" → "24/10/2026" (pt) ou "24 Oct 2026" (en). */
export function dataDoPrazo(iso: string, idioma: "pt" | "en"): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  if (idioma === "pt") return `${d}/${m}/${a}`;
  const meses = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${meses[Number(m) - 1]} ${a}`;
}

export function montarAvisoAoCliente({
  aviso,
  clienteNome,
  idioma,
  link,
}: {
  aviso: AvisoAoCliente;
  clienteNome: string;
  idioma: "pt" | "en";
  link: string;
}): { subject: string; html: string } {
  const pt = idioma === "pt";
  const primeiro = escapar(clienteNome.trim().split(/\s+/)[0] ?? "");
  const ola = pt ? `<p>Olá, ${primeiro}.</p>` : `<p>Hi ${primeiro},</p>`;
  const botao = `<p><a href="${escapar(link)}">${pt ? "Abrir o portal" : "Open the portal"}</a></p>`;

  if (aviso.tipo === "pedido") {
    const linhas = aviso.itens
      .map((i) => {
        const prazo = i.prazo ? ` (${pt ? "até" : "by"} ${dataDoPrazo(i.prazo, idioma)})` : "";
        const instr = i.instrucoes ? `<br>${escapar(i.instrucoes)}` : "";
        return `<li><strong>${escapar(i.nome)}</strong>${prazo}${instr}</li>`;
      })
      .join("");
    return {
      subject: pt ? "Sua consultora pediu um documento" : "Your consultant requested a document",
      html: `${ola}<p>${pt ? "Sua consultora pediu:" : "Your consultant requested:"}</p><ul>${linhas}</ul><p>${
        pt ? "Envie pelo portal, no item do pedido." : "Please upload it in the portal, under the request."
      }</p>${botao}`,
    };
  }

  if (aviso.tipo === "recusa") {
    return {
      subject: pt ? `Precisamos de um novo envio: ${aviso.documento}` : `Please upload again: ${aviso.documento}`,
      html: `${ola}<p>${pt ? "O documento" : "The document"} <strong>${escapar(aviso.documento)}</strong> ${
        pt ? "precisa ser enviado de novo." : "needs to be uploaded again."
      }</p><p>${pt ? "Motivo" : "Reason"}: ${escapar(aviso.motivo)}</p>${botao}`,
    };
  }

  return {
    subject: pt ? "Atualize seu formulário" : "Please update your form",
    html: `${ola}<p>${
      pt ? "Sua consultora reabriu o formulário para você atualizar:" : "Your consultant reopened your form so you can update it:"
    }</p><p>${escapar(aviso.motivo)}</p><p>${
      pt ? "Depois de corrigir, clique em \"Enviar formulário\" de novo." : "After updating, click \"Submit form\" again."
    }</p>${botao}`,
  };
}
