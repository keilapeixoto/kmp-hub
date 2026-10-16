import { getGoogleConnection, getValidAccessToken } from "./connections";
import { getEventsBetween, type GoogleCalendarEvent } from "./calendar";
import { podeCriarEventos } from "./agenda-calc";

// Situação do Google Calendar de quem está logado, para a Agenda do Hub.
// Só servidor (usa a conexão salva com refresh_token).

export type AgendaGoogle = {
  conectado: boolean;
  /** Conexão já tem permissão de criar eventos (senão, reconectar). */
  podeCriar: boolean;
  eventos: GoogleCalendarEvent[];
  erro: string | null;
};

export async function getAgendaGoogle(userId: string | null, dias = 30): Promise<AgendaGoogle> {
  const vazio: AgendaGoogle = { conectado: false, podeCriar: false, eventos: [], erro: null };
  if (!userId) return vazio;
  const conexao = await getGoogleConnection(userId).catch(() => null);
  if (!conexao) return vazio;
  const podeCriar = podeCriarEventos(conexao.scope);
  const token = await getValidAccessToken(userId).catch(() => null);
  if (!token) return { ...vazio, conectado: true, podeCriar, erro: "Não consegui falar com o Google. Reconecte em Integrações." };
  try {
    const agora = Date.now();
    const eventos = await getEventsBetween(
      token,
      new Date(agora - 24 * 3600 * 1000).toISOString(),
      new Date(agora + dias * 24 * 3600 * 1000).toISOString(),
    );
    return { conectado: true, podeCriar, eventos, erro: null };
  } catch {
    return { conectado: true, podeCriar, eventos: [], erro: "Não consegui ler o seu Google Calendar agora." };
  }
}
