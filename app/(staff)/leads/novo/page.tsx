import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth";
import { getConsultants, getDistinctLeadValues } from "@/lib/leads/data";
import { createLead } from "../actions";
import { LeadForm } from "../_components/lead-form";

export default async function NovoLeadPage() {
  const [profile, consultants, origens, servicos, paises] = await Promise.all([
    getCurrentUserProfile(),
    getConsultants(),
    getDistinctLeadValues("origem"),
    getDistinctLeadValues("servico_interesse"),
    getDistinctLeadValues("pais"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leads"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Leads
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Novo lead
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <LeadForm
          action={createLead}
          consultants={consultants}
          canAssignConsultant={consultants.length > 0}
          currentUserNome={profile?.nome ?? ""}
          distinctOrigens={origens}
          distinctServicos={servicos}
          distinctPaises={paises}
        />
      </div>
    </div>
  );
}
