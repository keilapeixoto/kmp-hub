import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth";
import { getConsultants } from "@/lib/leads/data";
import { getClients } from "@/lib/clients/data";
import {
  getAllCaseStages,
  getServiceTypes,
  getTeamMembers,
} from "@/lib/cases/data";
import type { CaseStage } from "@/lib/cases/types";
import { createCase } from "../actions";
import { CaseForm } from "../_components/case-form";

function groupStages(stages: CaseStage[]): Record<string, CaseStage[]> {
  return stages.reduce<Record<string, CaseStage[]>>((acc, stage) => {
    (acc[stage.service_type_id] ??= []).push(stage);
    return acc;
  }, {});
}

export default async function NovoProcessoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const clientIdParam = Array.isArray(params.clientId)
    ? params.clientId[0]
    : params.clientId;

  const [profile, consultants, clients, serviceTypes, allStages, teamMembers] =
    await Promise.all([
      getCurrentUserProfile(),
      getConsultants(),
      getClients({}),
      getServiceTypes(),
      getAllCaseStages(),
      getTeamMembers(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/processos"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Processos
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Novo processo
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <CaseForm
          action={createCase}
          clients={clients}
          serviceTypes={serviceTypes.filter((st) => !st.arquivado)}
          stagesByServiceType={groupStages(allStages)}
          consultants={consultants}
          teamMembers={teamMembers}
          canAssignConsultant={consultants.length > 0}
          currentUserNome={profile?.nome ?? ""}
          lockedClientId={clientIdParam}
        />
      </div>
    </div>
  );
}
