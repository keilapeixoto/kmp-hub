/**
 * Google Calendar — só leitura dos eventos de hoje (agenda real da pessoa,
 * pra seção "Resumo do dia" do /inicio).
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
  const params = new URLSearchParams({
    timeMin: new Date(agora - 24 * 3600 * 1000).toISOString(),
    timeMax: new Date(agora + dias * 24 * 3600 * 1000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
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
