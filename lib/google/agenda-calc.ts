// Agenda do Hub ligada ao Google Calendar: contas sem dependências do app
// (roda nos testes, tests/unit/google-agenda.test.mjs).

/** A conexão salva já tem a permissão de criar eventos? (precisa reconectar se não). */
export function podeCriarEventos(scope: string | null): boolean {
  if (!scope) return false;
  return scope
    .split(/\s+/)
    .some((s) => s === "https://www.googleapis.com/auth/calendar.events" || s === "https://www.googleapis.com/auth/calendar");
}

/** Corpo do evento para a API do Google Calendar (horários em UTC). */
export function corpoDoEvento(e: {
  titulo: string;
  inicio: string;
  fim: string | null;
  descricao: string | null;
  convidarEmail: string | null;
}) {
  const fim = e.fim ?? new Date(Date.parse(e.inicio) + 60 * 60 * 1000).toISOString();
  return {
    summary: e.titulo,
    ...(e.descricao ? { description: e.descricao } : {}),
    start: { dateTime: e.inicio },
    end: { dateTime: fim },
    ...(e.convidarEmail ? { attendees: [{ email: e.convidarEmail }] } : {}),
  };
}

/**
 * Junta compromissos do Hub e eventos do Google em ordem de horário. Evento
 * do Google que já está ligado a um compromisso (google_event_id) não aparece
 * duas vezes.
 */
export function juntarAgenda<H extends { id: string; inicio: string; google_event_id: string | null }, G extends { id: string; inicio: string }>(
  hub: H[],
  google: G[],
): ({ origem: "hub"; item: H } | { origem: "google"; item: G })[] {
  const ligados = new Set(hub.map((h) => h.google_event_id).filter(Boolean));
  const itens: ({ origem: "hub"; item: H; t: number } | { origem: "google"; item: G; t: number })[] = [
    ...hub.map((item) => ({ origem: "hub" as const, item, t: Date.parse(item.inicio) })),
    ...google.filter((g) => !ligados.has(g.id)).map((item) => ({ origem: "google" as const, item, t: Date.parse(item.inicio) })),
  ];
  itens.sort((a, b) => a.t - b.t);
  return itens.map(({ t: _t, ...resto }) => resto) as ({ origem: "hub"; item: H } | { origem: "google"; item: G })[];
}
