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

/**
 * Não lidos da caixa Principal (sem Promoções/Social), contados de verdade
 * (até 500 — o resultSizeEstimate do Gmail é só uma estimativa e dava "201").
 */
export async function getUnreadSummary(
  accessToken: string,
  limit = 6,
): Promise<{ totalNaoLidos: number; maisNaoLidos: boolean; mensagens: GmailUnreadMessage[] }> {
  const listRes = await fetch(
    `${GMAIL_BASE}/messages?q=${encodeURIComponent("in:inbox category:primary is:unread")}&maxResults=500`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    throw new Error(`Gmail respondeu ${listRes.status} ao listar`);
  }
  const listData = await listRes.json();
  const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);
  const totalNaoLidos = ids.length;
  const maisNaoLidos = Boolean(listData.nextPageToken);

  const mensagens = await Promise.all(
    ids.slice(0, limit).map(async (id) => {
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
    maisNaoLidos,
    mensagens: mensagens.filter((m): m is GmailUnreadMessage => m !== null),
  };
}

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function extractBodyText(payload: unknown): string {
  const part = payload as {
    body?: { data?: string };
    parts?: unknown[];
    mimeType?: string;
  };
  if (part.body?.data) return decodeBase64Url(part.body.data);
  if (part.parts) {
    for (const sub of part.parts) {
      const text = extractBodyText(sub);
      if (text) return text;
    }
  }
  return "";
}

/**
 * Busca o código de autenticação do ImmiAccount mais recente (Department
 * of Home Affairs manda um e-mail com "ImmiAccount: 123456" no corpo
 * sempre que a etapa de verificação é acionada). Só considera e-mail
 * recebido nos últimos `maxAgeMinutes` — evita reusar um código antigo de
 * uma tentativa de login anterior.
 */
export async function getLatestImmiAccountCode(
  accessToken: string,
  maxAgeMinutes = 10,
): Promise<{ code: string; receivedAt: string } | null> {
  const params = new URLSearchParams({
    q: 'from:noreply-lusc@homeaffairs.gov.au subject:"ImmiAccount authentication code"',
    maxResults: "1",
  });
  const listRes = await fetch(`${GMAIL_BASE}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail respondeu ${listRes.status} ao listar`);
  const listData = await listRes.json();
  const id: string | undefined = listData.messages?.[0]?.id;
  if (!id) return null;

  const msgRes = await fetch(`${GMAIL_BASE}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!msgRes.ok) throw new Error(`Gmail respondeu ${msgRes.status} ao buscar mensagem`);
  const msg = await msgRes.json();

  const internalDate = Number(msg.internalDate ?? 0);
  const ageMinutes = (Date.now() - internalDate) / 60000;
  if (ageMinutes > maxAgeMinutes) return null;

  const body = extractBodyText(msg.payload) || (msg.snippet ?? "");
  const match = body.match(/ImmiAccount:\s*(\d{6})/);
  if (!match) return null;

  return { code: match[1], receivedAt: new Date(internalDate).toISOString() };
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
