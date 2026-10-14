// Como mostrar agenda e e-mail no Início (cara de agenda e cara de caixa de
// entrada). Sem dependências: roda no servidor e nos testes. "Hoje" é sempre
// no fuso informado (o servidor da Vercel roda em UTC).

import type { GoogleCalendarEvent } from "./calendar";

/** Data "AAAA-MM-DD" de um instante, no fuso dado. */
function diaNoFuso(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function somaDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

/** Dia (AAAA-MM-DD) em que o evento começa, no fuso dado. */
function diaDoEvento(e: GoogleCalendarEvent, tz: string): string {
  if (e.diaInteiro) return e.inicio.slice(0, 10);
  return diaNoFuso(new Date(e.inicio), tz);
}

export type DiaDaSemana = { data: string; dia: number; semana: string; hoje: boolean };

/** Os 7 dias a partir de hoje (faixa de calendário). */
export function semana(agora: Date, tz: string): DiaDaSemana[] {
  const hoje = diaNoFuso(agora, tz);
  return Array.from({ length: 7 }, (_, i) => {
    const data = somaDias(hoje, i);
    const meio = new Date(`${data}T12:00:00Z`);
    return {
      data,
      dia: Number(data.slice(8, 10)),
      semana: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
        .format(meio)
        .replace(".", ""),
      hoje: i === 0,
    };
  });
}

/** Eventos separados em hoje, amanhã e próximos dias. */
export function agruparPorDia(eventos: GoogleCalendarEvent[], agora: Date, tz: string) {
  const hoje = diaNoFuso(agora, tz);
  const amanha = somaDias(hoje, 1);
  const g = { hoje: [] as GoogleCalendarEvent[], amanha: [] as GoogleCalendarEvent[], depois: [] as GoogleCalendarEvent[] };
  for (const e of eventos) {
    const d = diaDoEvento(e, tz);
    if (d === hoje) g.hoje.push(e);
    else if (d === amanha) g.amanha.push(e);
    else if (d > amanha) g.depois.push(e);
  }
  return g;
}

/** Dias (AAAA-MM-DD) que têm pelo menos um evento. */
export function diasComEvento(eventos: GoogleCalendarEvent[], tz: string): Set<string> {
  return new Set(eventos.map((e) => diaDoEvento(e, tz)));
}

/** Hora do evento ("09:30") ou "Dia todo". */
export function horaDoEvento(e: GoogleCalendarEvent, tz: string): string {
  if (e.diaInteiro) return "Dia todo";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(e.inicio));
}

/** "Renata Croaro" de '"Renata Croaro" <renata@gmail.com>'. */
export function nomeRemetente(de: string): string {
  const m = /^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/.exec(de);
  const nome = m?.[1]?.trim();
  return nome || de.replace(/[<>]/g, "").trim();
}

export function iniciais(nome: string): string {
  const base = nome.includes("@") ? nome.split("@")[0] : nome;
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  if (nome.includes("@")) return (partes[0]?.[0] ?? "?").toUpperCase();
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "?";
}

/** "09:30" se chegou hoje; "12 out" se antes. */
export function quandoRecebido(data: string | null, agora: Date, tz: string): string {
  if (!data) return "";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  if (diaNoFuso(d, tz) === diaNoFuso(agora, tz)) {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: tz }).format(d).replace(".", "").replace(" de ", " ");
}
