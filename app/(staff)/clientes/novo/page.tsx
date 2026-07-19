import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth";
import { getConsultants } from "@/lib/leads/data";
import { getDistinctClientValues } from "@/lib/clients/data";
import { createClientRecord } from "../actions";
import { ClientForm } from "../_components/client-form";

export default async function NovoClientePage() {
  const [profile, consultants, paises, situacoes] = await Promise.all([
    getCurrentUserProfile(),
    getConsultants(),
    getDistinctClientValues("pais"),
    getDistinctClientValues("situacao"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Novo cliente
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ClientForm
          action={createClientRecord}
          consultants={consultants}
          canAssignConsultant={consultants.length > 0}
          currentUserNome={profile?.nome ?? ""}
          distinctPaises={paises}
          distinctSituacoes={situacoes}
        />
      </div>
    </div>
  );
}
