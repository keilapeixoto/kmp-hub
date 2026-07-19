import Link from "next/link";
import { getClients } from "@/lib/clients/data";
import { getLeads } from "@/lib/leads/data";
import { createAppointment } from "../actions";
import { AppointmentForm } from "../_components/appointment-form";

export default async function NovoCompromissoPage() {
  const [clients, leads] = await Promise.all([getClients({}), getLeads({})]);

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
          Novo compromisso
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AppointmentForm
          action={createAppointment}
          clients={clients}
          leads={leads}
        />
      </div>
    </div>
  );
}
