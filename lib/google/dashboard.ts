import { getValidAccessToken } from "./connections";
import { getTodayEvents, type GoogleCalendarEvent } from "./calendar";
import { getUnreadSummary, type GmailUnreadMessage } from "./gmail";

export type GoogleDaySummary = {
  connected: boolean;
  eventos: GoogleCalendarEvent[];
  totalNaoLidos: number;
  mensagensUrgentes: GmailUnreadMessage[];
  erro: string | null;
};

/**
 * Busca agenda de hoje + resumo de não lidos em paralelo. Falha de um lado
 * (ex.: Calendar OK mas Gmail deu erro) não derruba o outro.
 */
export async function getGoogleDaySummary(userId: string): Promise<GoogleDaySummary> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { connected: false, eventos: [], totalNaoLidos: 0, mensagensUrgentes: [], erro: null };
  }

  const [eventosResult, gmailResult] = await Promise.allSettled([
    getTodayEvents(accessToken),
    getUnreadSummary(accessToken),
  ]);

  const eventos = eventosResult.status === "fulfilled" ? eventosResult.value : [];
  const gmail =
    gmailResult.status === "fulfilled"
      ? gmailResult.value
      : { totalNaoLidos: 0, mensagens: [] };

  const algumErro = eventosResult.status === "rejected" || gmailResult.status === "rejected";

  return {
    connected: true,
    eventos,
    totalNaoLidos: gmail.totalNaoLidos,
    mensagensUrgentes: gmail.mensagens.filter((m) => m.importante),
    erro: algumErro ? "parte da conexão com o Google falhou — tente reconectar" : null,
  };
}
