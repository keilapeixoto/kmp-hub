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

export async function getTodayEvents(
  accessToken: string,
): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
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
