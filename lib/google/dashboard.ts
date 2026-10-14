import { getValidAccessToken } from "./connections";
import { getUpcomingEvents, type GoogleCalendarEvent } from "./calendar";
import { getUnreadSummary, type GmailUnreadMessage } from "./gmail";

export type GoogleDaySummary = {
  connected: boolean;
  /** Eventos de hoje até os próximos 7 dias. */
  eventos: GoogleCalendarEvent[];
  /** Não lidos da caixa Principal (contagem exata até 500). */
  totalNaoLidos: number;
  maisNaoLidos: boolean;
  /** Últimos não lidos da Principal (os importantes vêm marcados). */
  mensagens: GmailUnreadMessage[];
  erro: string | null;
};

export const RESUMO_VAZIO: GoogleDaySummary = {
  connected: false,
  eventos: [],
  totalNaoLidos: 0,
  maisNaoLidos: false,
  mensagens: [],
  erro: null,
};

/**
 * Busca agenda dos próximos dias + resumo de não lidos em paralelo. Falha de
 * um lado (ex.: Calendar OK mas Gmail deu erro) não derruba o outro.
 */
export async function getGoogleDaySummary(userId: string): Promise<GoogleDaySummary> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return RESUMO_VAZIO;

  const [eventosResult, gmailResult] = await Promise.allSettled([
    getUpcomingEvents(accessToken),
    getUnreadSummary(accessToken),
  ]);

  const eventos = eventosResult.status === "fulfilled" ? eventosResult.value : [];
  const gmail =
    gmailResult.status === "fulfilled"
      ? gmailResult.value
      : { totalNaoLidos: 0, maisNaoLidos: false, mensagens: [] };

  const algumErro = eventosResult.status === "rejected" || gmailResult.status === "rejected";

  return {
    connected: true,
    eventos,
    totalNaoLidos: gmail.totalNaoLidos,
    maisNaoLidos: gmail.maisNaoLidos,
    mensagens: gmail.mensagens,
    erro: algumErro ? "parte da conexão com o Google falhou — tente reconectar" : null,
  };
}
