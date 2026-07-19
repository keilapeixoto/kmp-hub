import Link from "next/link";
import { getAppointments, getSummarizedAppointmentIds } from "@/lib/appointments/data";
import {
  dayKeySydney,
  formatDateSydney,
  formatTimesInAllZones,
  isPastIso,
} from "@/lib/appointments/timezones";
import { getClients } from "@/lib/clients/data";
import type { Appointment } from "@/lib/appointments/types";

export default async function AgendaPage() {
  const [appointments, summarized, clients] = await Promise.all([
    getAppointments(),
    getSummarizedAppointmentIds(),
    getClients({}),
  ]);

  const clientName = (id: string | null) =>
    id ? (clients.find((c) => c.id === id)?.nome ?? null) : null;

  const byDay = new Map<string, Appointment[]>();
  for (const ap of appointments) {
    const key = dayKeySydney(ap.inicio);
    const list = byDay.get(key) ?? [];
    list.push(ap);
    byDay.set(key, list);
  }

  const days = Array.from(byDay.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const pendingSummaries = appointments.filter(
    (ap) => isPastIso(ap.inicio) && !summarized.has(ap.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Agenda</h1>
        <Link
          href="/agenda/novo"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo compromisso
        </Link>
      </div>

      {pendingSummaries.length > 0 ? (
        <div className="rounded-lg border border-kmp-orange/30 bg-kmp-orange/5 p-4 text-sm">
          <p className="font-medium text-kmp-orange">
            ⚠ {pendingSummaries.length} compromisso
            {pendingSummaries.length === 1 ? "" : "s"} sem resumo pós-consulta
          </p>
          <ul className="mt-2 space-y-1">
            {pendingSummaries.slice(0, 5).map((ap) => (
              <li key={ap.id}>
                <Link
                  href={`/agenda/${ap.id}`}
                  className="text-kmp-graphite hover:text-kmp-orange"
                >
                  {ap.titulo}
                  {clientName(ap.client_id) ? ` · ${clientName(ap.client_id)}` : ""} —{" "}
                  {formatDateSydney(ap.inicio)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {days.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Nenhum compromisso na agenda.
        </p>
      ) : (
        days.map(([dayKey, dayAppointments]) => (
          <div key={dayKey} className="rounded-lg bg-white shadow-sm">
            <h2 className="border-b border-black/5 px-4 py-3 font-heading text-sm text-kmp-graphite">
              {formatDateSydney(dayAppointments[0].inicio)}
            </h2>
            <ul className="divide-y divide-black/5">
              {dayAppointments.map((ap) => {
                const past = isPastIso(ap.inicio);
                const missingSummary = past && !summarized.has(ap.id);
                return (
                  <li key={ap.id} className="px-4 py-3">
                    <Link
                      href={`/agenda/${ap.id}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="text-sm font-medium text-kmp-graphite hover:text-kmp-orange">
                        {ap.titulo}
                        {ap.tipo ? (
                          <span className="ml-2 text-xs text-kmp-graphite/50">
                            {ap.tipo}
                          </span>
                        ) : null}
                        {clientName(ap.client_id) ? (
                          <span className="ml-2 text-xs text-kmp-graphite/50">
                            · {clientName(ap.client_id)}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-kmp-graphite/60">
                        {formatTimesInAllZones(ap.inicio)}
                        {missingSummary ? (
                          <span className="ml-2 font-medium text-kmp-orange">
                            ⚠ sem resumo
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
