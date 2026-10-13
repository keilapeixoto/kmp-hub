/**
 * Gmail — resumo de não lidos (pro "Resumo do dia" do /inicio) e envio de
 * e-mail de verdade pela conta conectada (aparece na caixa de Enviados de
 * quem conectou, diferente do Resend que já existe pros avisos automáticos
 * do sistema).
 *
 * "Urgente" aqui é só o marcador IMPORTANT que o próprio Gmail calcula —
 * não é nenhuma classificação nossa, só repassamos o sinal que já existe.
 */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailUnreadMessage = {
  id: string;
  de: string;
  assunto: string;
  trecho: string;
  importante: boolean;
  recebidoEm: string | null;
};

export async function getUnreadSummary(
  accessToken: string,
  limit = 8,
): Promise<{ totalNaoLidos: number; mensagens: GmailUnreadMessage[] }> {
  const listRes = await fetch(
    `${GMAIL_BASE}/messages?q=${encodeURIComponent("is:unread in:inbox")}&maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    throw new Error(`Gmail respondeu ${listRes.status} ao listar`);
  }
  const listData = await listRes.json();
  const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);
  const totalNaoLidos: number = listData.resultSizeEstimate ?? ids.length;

  const mensagens = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `${GMAIL_BASE}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
      const get = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      return {
        id,
        de: get("From"),
        assunto: get("Subject") || "(sem assunto)",
        trecho: data.snippet ?? "",
        importante: (data.labelIds ?? []).includes("IMPORTANT"),
        recebidoEm: get("Date") || null,
      };
    }),
  );

  return {
    totalNaoLidos,
    mensagens: mensagens.filter((m): m is GmailUnreadMessage => m !== null),
  };
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmail(
  accessToken: string,
  params: { to: string; subject: string; html: string },
): Promise<{ ok: boolean; error: string | null }> {
  const message = [
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`,
    "Content-Type: text/html; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    params.html,
  ].join("\r\n");

  const res = await fetch(`${GMAIL_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(message) }),
  });

  if (!res.ok) {
    return { ok: false, error: `Gmail respondeu ${res.status} ao enviar` };
  }
  return { ok: true, error: null };
}
