import Link from "next/link";
import { CalendarDays, ExternalLink, NotebookPen } from "lucide-react";
import { Etiqueta, FaixaTitulo } from "@/components/ui/vivid";
import { getCurrentUserId } from "@/lib/auth";
import { getAppointments, getSummarizedAppointmentIds } from "@/lib/appointments/data";
import {
  dayKeySydney,
  formatDateSydney,
  formatTimesInAllZones,
  isPastIso,
} from "@/lib/appointments/timezones";
import { getClients } from "@/lib/clients/data";
import { getAgendaGoogle } from "@/lib/google/agenda";
import { juntarAgenda } from "@/lib/google/agenda-calc";

// Agenda (out/2026): compromissos do Hub (consultas ligadas a cliente, com
// resumo obrigatório depois) junto com o Google Calendar de quem está logado.
// Compromisso criado no Hub pode ir para o Google; evento só do Google
// aparece com a etiqueta "Google" e abre lá.

/** Instante de 24 h atrás (a lista do Hub começa em ontem). */
function inicioDeOntem(): number {
  return Date.now() - 24 * 3600 * 1000;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const avisoGoogle = Array.isArray(sp.google) ? sp.google[0] : sp.google;
  const userId = await getCurrentUserId();
  const [appointments, summarized, clients, google] = await Promise.all([
    getAppointments(),
    getSummarizedAppointmentIds(),
    getClients({}),
    getAgendaGoogle(userId),
  ]);

  const clientName = (id: string | null) =>
    id ? (clients.find((c) => c.id === id)?.nome ?? null) : null;

  // Hub: a partir de ontem (os passados sem resumo ficam no aviso acima).
  const ontem = inicioDeOntem();
  const futuros = appointments.filter((ap) => Date.parse(ap.inicio) >= ontem);
  const itens = juntarAgenda(futuros, google.eventos);

  const porDia = new Map<string, typeof itens>();
  for (const it of itens) {
    const chave = it.origem === "google" && it.item.diaInteiro ? it.item.inicio.slice(0, 10) : dayKeySydney(it.item.inicio);
    porDia.set(chave, [...(porDia.get(chave) ?? []), it]);
  }
  const dias = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const pendingSummaries = appointments.filter((ap) => isPastIso(ap.inicio) && !summarized.has(ap.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-text">Agenda</h1>
        <Link
          href="/agenda/novo"
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Novo compromisso
        </Link>
      </div>

      {avisoGoogle === "erro" ? (
        <p className="rounded-2xl bg-[#fde2e5] px-4 py-3 text-sm text-[#9a2433] dark:bg-[#ef6b7d]/20 dark:text-[#f6b6bf]">
          O compromisso foi salvo no Hub, mas não consegui criar o evento no seu Google Calendar.
        </p>
      ) : null}

      {!google.conectado ? (
        <p className="rounded-2xl bg-kmp-surface px-4 py-3 text-sm text-kmp-text/75 shadow-sm">
          Conecte sua conta Google em{" "}
          <Link href="/configuracoes/integracoes" className="font-semibold text-kmp-orange hover:underline">
            Configurações → Integrações
          </Link>{" "}
          para ver o seu Google Calendar aqui e criar os compromissos do Hub também lá.
        </p>
      ) : !google.podeCriar ? (
        <p className="rounded-2xl bg-[#fcf1cf] px-4 py-3 text-sm text-[#7a5806] dark:bg-[#f0c040]/20 dark:text-[#f6dc8f]">
          Seu Google Calendar já aparece aqui. Para o Hub também criar eventos nele, reconecte a conta uma vez em{" "}
          <Link href="/configuracoes/integracoes" className="font-semibold underline">
            Configurações → Integrações
          </Link>{" "}
          (a permissão nova é pedida na hora).
        </p>
      ) : null}
      {google.erro ? (
        <p className="rounded-2xl bg-kmp-surface px-4 py-3 text-sm text-kmp-text/70 shadow-sm">{google.erro}</p>
      ) : null}

      {pendingSummaries.length > 0 ? (
        <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
          <FaixaTitulo
            titulo={`${pendingSummaries.length} ${pendingSummaries.length === 1 ? "compromisso sem resumo" : "compromissos sem resumo"} pós-consulta`}
            cor="laranja"
            icon={NotebookPen}
          />
          <ul className="space-y-1 text-sm">
            {pendingSummaries.slice(0, 5).map((ap) => (
              <li key={ap.id}>
                <Link href={`/agenda/${ap.id}`} className="text-kmp-text hover:text-kmp-orange">
                  {ap.titulo}
                  {clientName(ap.client_id) ? ` · ${clientName(ap.client_id)}` : ""} — {formatDateSydney(ap.inicio)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dias.length === 0 ? (
        <p className="rounded-3xl bg-kmp-surface p-8 text-center text-sm text-kmp-text/60 shadow-sm">
          Nenhum compromisso nos próximos dias.
        </p>
      ) : (
        dias.map(([dia, lista]) => (
          <section key={dia} className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
            <FaixaTitulo
              titulo={new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
              cor="lilas"
              icon={CalendarDays}
            />
            <ul className="divide-y divide-kmp-divider">
              {lista.map((it) =>
                it.origem === "hub" ? (
                  <li key={`h-${it.item.id}`} className="py-2.5">
                    <Link href={`/agenda/${it.item.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-kmp-text hover:text-kmp-orange">
                        {it.item.titulo}
                        {it.item.tipo ? <span className="ml-2 text-xs text-kmp-text/50">{it.item.tipo}</span> : null}
                        {clientName(it.item.client_id) ? (
                          <span className="ml-2 text-xs text-kmp-text/50">· {clientName(it.item.client_id)}</span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-kmp-text/60">
                        {formatTimesInAllZones(it.item.inicio)}
                        {it.item.google_event_id ? <Etiqueta cor="azul">também no Google</Etiqueta> : null}
                        {isPastIso(it.item.inicio) && !summarized.has(it.item.id) ? (
                          <Etiqueta cor="laranja">sem resumo</Etiqueta>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ) : (
                  <li key={`g-${it.item.id}`} className="py-2.5">
                    <a
                      href={it.item.link ?? "https://calendar.google.com"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-kmp-text/85 hover:text-kmp-orange">
                        {it.item.titulo}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </span>
                      <span className="flex items-center gap-2 text-xs text-kmp-text/60">
                        {it.item.diaInteiro ? "dia inteiro" : formatTimesInAllZones(it.item.inicio)}
                        <Etiqueta cor="cinza">Google</Etiqueta>
                      </span>
                    </a>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
