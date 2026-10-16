/**
 * Google Calendar da pessoa logada: leitura (Resumo do dia no /inicio e
 * Agenda do Hub) e criação de evento ao criar compromisso no Hub (precisa da
 * permissão calendar.events — conexões antigas só leem até reconectar).
 */

export type GoogleCalendarEvent = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  local: string | null;
  link: string | null;
};

/**
 * Eventos de agora até os próximos `dias` dias. Começa 24h antes para não
 * perder o começo de "hoje" em fusos à frente de UTC (o servidor roda em UTC);
 * quem mostra separa por dia no fuso certo (lib/google/visual.ts).
 */
export async function getUpcomingEvents(
  accessToken: string,
  dias = 7,
): Promise<GoogleCalendarEvent[]> {
  const agora = Date.now();
  return getEventsBetween(
    accessToken,
    new Date(agora - 24 * 3600 * 1000).toISOString(),
    new Date(agora + dias * 24 * 3600 * 1000).toISOString(),
  );
}

/** Eventos do calendário principal entre duas datas (ISO, UTC). */
export async function getEventsBetween(
  accessToken: string,
  inicioIso: string,
  fimIso: string,
  max = 100,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: inicioIso,
    timeMax: fimIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(max),
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Google Calendar respondeu ${res.status}`);
  }
  const data = await res.json();
  const items: unknown[] = data.items ?? [];

  return items.map((raw) => {
    const item = raw as {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
      htmlLink?: string;
    };
    const diaInteiro = !item.start?.dateTime;
    return {
      id: item.id,
      titulo: item.summary ?? "(sem título)",
      inicio: item.start?.dateTime ?? item.start?.date ?? "",
      fim: item.end?.dateTime ?? item.end?.date ?? "",
      diaInteiro,
      local: item.location ?? null,
      link: item.htmlLink ?? null,
    };
  });
}

/**
 * Cria o evento no calendário principal. Com enviarConvite, o Google manda
 * o convite por e-mail aos convidados (sendUpdates=all); sem, ninguém recebe nada.
 */
export async function createCalendarEvent(
  accessToken: string,
  corpo: object,
  enviarConvite: boolean,
): Promise<{ id: string | null; link: string | null; erro: string | null }> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=${enviarConvite ? "all" : "none"}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    },
  );
  if (!res.ok) {
    return { id: null, link: null, erro: `Google Calendar respondeu ${res.status}` };
  }
  const data = (await res.json()) as { id?: string; htmlLink?: string };
  return { id: data.id ?? null, link: data.htmlLink ?? null, erro: null };
}
