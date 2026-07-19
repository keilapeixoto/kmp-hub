import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAppointment,
  getAppointmentSummary,
} from "@/lib/appointments/data";
import {
  formatDateSydney,
  formatTimesInAllZones,
  isPastIso,
} from "@/lib/appointments/timezones";
import { getClient } from "@/lib/clients/data";
import { saveAppointmentSummary } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export default async function CompromissoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const appointment = await getAppointment(id);
  if (!appointment) notFound();

  const [summary, client] = await Promise.all([
    getAppointmentSummary(id),
    appointment.client_id ? getClient(appointment.client_id) : Promise.resolve(null),
  ]);

  const past = isPastIso(appointment.inicio);
  const saveWithId = saveAppointmentSummary.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/agenda"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Agenda
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          {appointment.titulo}
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/70">
          {formatDateSydney(appointment.inicio)} ·{" "}
          {formatTimesInAllZones(appointment.inicio)}
          {appointment.fim ? ` — fim ${formatTimesInAllZones(appointment.fim)}` : ""}
        </p>
        {client ? (
          <p className="mt-1 text-sm text-kmp-graphite/70">
            Cliente:{" "}
            <Link
              href={`/clientes/${client.id}`}
              className="text-kmp-orange hover:underline"
            >
              {client.nome}
            </Link>
          </p>
        ) : null}
      </div>

      {past && !summary ? (
        <p className="rounded-lg border border-kmp-orange/30 bg-kmp-orange/5 p-4 text-sm font-medium text-kmp-orange">
          ⚠ Este compromisso já aconteceu e ainda não tem resumo — o registro é
          obrigatório após cada consulta.
        </p>
      ) : null}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg text-kmp-graphite">
          Resumo pós-consulta
        </h2>
        <p className="mt-1 text-xs text-kmp-graphite/50">
          Nota interna — nunca aparece no portal do cliente.
        </p>

        <form action={saveWithId} className="mt-4 space-y-4">
          <div>
            <label htmlFor="resumo" className={labelClass}>
              Resumo *
            </label>
            <textarea
              id="resumo"
              name="resumo"
              rows={4}
              required
              defaultValue={summary?.resumo ?? ""}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="decisoes" className={labelClass}>
                Decisões
              </label>
              <textarea
                id="decisoes"
                name="decisoes"
                rows={3}
                defaultValue={summary?.decisoes ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="riscos" className={labelClass}>
                Riscos
              </label>
              <textarea
                id="riscos"
                name="riscos"
                rows={3}
                defaultValue={summary?.riscos ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="documentos_solicitados" className={labelClass}>
                Documentos solicitados
              </label>
              <textarea
                id="documentos_solicitados"
                name="documentos_solicitados"
                rows={3}
                defaultValue={summary?.documentos_solicitados ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="proximos_passos" className={labelClass}>
                Próximos passos
              </label>
              <textarea
                id="proximos_passos"
                name="proximos_passos"
                rows={3}
                defaultValue={summary?.proximos_passos ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="proximo_acompanhamento" className={labelClass}>
                Próximo acompanhamento
              </label>
              <input
                id="proximo_acompanhamento"
                name="proximo_acompanhamento"
                type="date"
                defaultValue={summary?.proximo_acompanhamento ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {summary ? "Atualizar resumo" : "Registrar resumo"}
          </button>
        </form>
      </div>
    </div>
  );
}
