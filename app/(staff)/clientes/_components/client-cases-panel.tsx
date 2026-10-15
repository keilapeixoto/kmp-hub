import Link from "next/link";
import { getCaseStatusLabels } from "@/lib/cases/data";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";
import { FaseNoPortal } from "./fase-no-portal";

export async function ClientCasesPanel({
  clientId,
  cases,
  serviceTypes,
  stagesById,
  allStages,
}: {
  clientId: string;
  cases: Case[];
  serviceTypes: ServiceType[];
  stagesById: Record<string, CaseStage>;
  allStages: CaseStage[];
}) {
  const statusLabels = await getCaseStatusLabels();
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/processos/novo?clientId=${clientId}`}
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Novo processo
        </Link>
      </div>

      <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        {cases.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-text/50">
            Nenhum processo cadastrado para este cliente.
          </p>
        ) : (
          <ul className="divide-y divide-kmp-divider">
            {cases.map((c) => (
              <li key={c.id} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/processos/${c.id}`}
                    className="font-medium text-kmp-text hover:text-kmp-orange"
                  >
                    {serviceTypeName(c.service_type_id)}
                  </Link>
                  <p className="text-kmp-text/50">
                    {c.etapa_id ? (stagesById[c.etapa_id]?.nome ?? "—") : "Sem etapa"}
                  </p>
                </div>
                <span className="rounded-full bg-kmp-divider px-2.5 py-0.5 text-xs font-medium text-kmp-text/80">
                  {statusLabels[c.status] ?? c.status}
                </span>
                </div>
                <FaseNoPortal
                  caseId={c.id}
                  etapaAtual={c.etapa_id}
                  etapas={allStages
                    .filter((s) => s.service_type_id === c.service_type_id)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((s) => ({ id: s.id, nome: s.nome }))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
