import Link from "next/link";
import { getCaseStatusLabels } from "@/lib/cases/data";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import {
  CaseConsultorSelect,
  CaseEtapaSelect,
  CasePrazoInput,
  CasePrioridadeSelect,
  CaseStatusSelect,
} from "./case-inline-edit";

export async function CasesTable({
  cases,
  clients,
  consultants,
  serviceTypes,
  stagesById,
}: {
  cases: Case[];
  clients: Client[];
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
  stagesById: Record<string, CaseStage>;
}) {
  const statusLabels = await getCaseStatusLabels();
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.nome ?? "—";
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";

  if (cases.length === 0) {
    return (
      <p className="rounded-3xl bg-kmp-surface p-8 text-center text-sm text-kmp-text/50 shadow-sm">
        Nenhum processo encontrado com esses filtros.
      </p>
    );
  }

  const stagesByServiceType = new Map<string, CaseStage[]>();
  for (const stage of Object.values(stagesById)) {
    const list = stagesByServiceType.get(stage.service_type_id) ?? [];
    list.push(stage);
    stagesByServiceType.set(stage.service_type_id, list);
  }
  for (const list of stagesByServiceType.values()) {
    list.sort((a, b) => a.ordem - b.ordem);
  }

  const groups = new Map<string, Case[]>();
  for (const c of cases) {
    const key = serviceTypeName(c.service_type_id);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => clientName(a.client_id).localeCompare(clientName(b.client_id), "pt-BR"));
  }
  const sortedGroupNames = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return (
    <div className="space-y-6">
      {sortedGroupNames.map((groupName) => {
        const groupCases = groups.get(groupName)!;
        const stages = stagesByServiceType.get(groupCases[0].service_type_id) ?? [];

        return (
          <div key={groupName}>
            <h3 className="mb-2 text-sm font-semibold text-kmp-text">
              {groupName}{" "}
              <span className="font-normal text-kmp-text/50">
                ({groupCases.length})
              </span>
            </h3>
            <div className="overflow-x-auto rounded-3xl bg-kmp-surface shadow-sm">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-kmp-divider text-xs uppercase text-kmp-text/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Etapa</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Prioridade</th>
                    <th className="px-4 py-3 font-medium">Consultor</th>
                    <th className="px-4 py-3 font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {groupCases.map((c) => (
                    <tr key={c.id} className="border-b border-kmp-divider last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/processos/${c.id}`}
                          className="font-medium text-kmp-text hover:text-kmp-orange"
                        >
                          {clientName(c.client_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <CaseEtapaSelect
                          caseId={c.id}
                          etapaId={c.etapa_id}
                          stages={stages}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CaseStatusSelect
                          caseId={c.id}
                          status={c.status}
                          statusLabels={statusLabels}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CasePrioridadeSelect caseId={c.id} prioridade={c.prioridade} />
                      </td>
                      <td className="px-4 py-3">
                        <CaseConsultorSelect
                          caseId={c.id}
                          consultorId={c.consultor_id}
                          consultants={consultants}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CasePrazoInput caseId={c.id} prazo={c.prazo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
