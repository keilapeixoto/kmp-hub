import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserProfile, getCurrentUserRole } from "@/lib/auth";
import { getClientByLeadId } from "@/lib/clients/data";
import {
  getConsultants,
  getDistinctLeadValues,
  getLead,
  getLeadEvents,
} from "@/lib/leads/data";
import { registerContact, updateLead } from "../actions";
import { ConvertLeadButton } from "../_components/convert-lead-button";
import { DeleteLeadButton } from "../_components/delete-lead-button";
import { LeadForm } from "../_components/lead-form";
import { LeadTimeline } from "../_components/lead-timeline";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await getLead(id);
  if (!lead) notFound();

  const role = await getCurrentUserRole();
  const isStaffRole = role === "admin" || role === "director";

  const [profile, events, consultants, origens, servicos, paises, convertedClient] =
    await Promise.all([
      getCurrentUserProfile(),
      getLeadEvents(id),
      getConsultants(),
      getDistinctLeadValues("origem"),
      getDistinctLeadValues("servico_interesse"),
      getDistinctLeadValues("pais"),
      lead.status === "convertido" ? getClientByLeadId(id) : Promise.resolve(null),
    ]);

  const updateLeadWithId = updateLead.bind(null, id);
  const registerContactWithId = registerContact.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/leads"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            ← Leads
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {lead.nome}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {convertedClient ? (
            <Link
              href={`/clientes/${convertedClient.id}`}
              className="text-sm font-medium text-kmp-orange hover:underline"
            >
              Ver cliente convertido →
            </Link>
          ) : (
            <ConvertLeadButton leadId={lead.id} />
          )}
          {isStaffRole ? <DeleteLeadButton leadId={lead.id} /> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          <LeadForm
            action={updateLeadWithId}
            lead={lead}
            consultants={consultants}
            canAssignConsultant={consultants.length > 0}
            currentUserNome={profile?.nome ?? ""}
            distinctOrigens={origens}
            distinctServicos={servicos}
            distinctPaises={paises}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg text-kmp-graphite">
              Registrar contato
            </h2>
            <form action={registerContactWithId} className="mt-4 space-y-3">
              <textarea
                name="descricao"
                rows={3}
                placeholder="O que foi conversado?"
                className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Registrar
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg text-kmp-graphite">
              Linha do tempo
            </h2>
            <div className="mt-4">
              <LeadTimeline events={events} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
