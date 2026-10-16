import Link from "next/link";
import { getClients } from "@/lib/clients/data";
import { getLeads } from "@/lib/leads/data";
import { createAppointment } from "../actions";
import { AppointmentForm } from "../_components/appointment-form";
import { getCurrentUserId } from "@/lib/auth";
import { getGoogleConnection } from "@/lib/google/connections";
import { podeCriarEventos } from "@/lib/google/agenda-calc";

export default async function NovoCompromissoPage() {
  const userId = await getCurrentUserId();
  const [clients, leads, conexao] = await Promise.all([
    getClients({}),
    getLeads({}),
    userId ? getGoogleConnection(userId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/agenda"
          className="text-sm text-kmp-text/60 hover:text-kmp-orange"
        >
          ← Agenda
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-text">
          Novo compromisso
        </h1>
      </div>

      <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
        <AppointmentForm
          action={createAppointment}
          clients={clients}
          leads={leads}
          google={{ conectado: Boolean(conexao), podeCriar: podeCriarEventos(conexao?.scope ?? null) }}
        />
      </div>
    </div>
  );
}
