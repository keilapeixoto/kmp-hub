import Link from "next/link";
import { CASE_STATUS_LABELS } from "@/lib/cases/constants";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";

export function ClientCasesPanel({
  clientId,
  cases,
  serviceTypes,
  stagesById,
}: {
  clientId: string;
  cases: Case[];
  serviceTypes: ServiceType[];
  stagesById: Record<string, CaseStage>;
}) {
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={`/processos/novo?clientId=${clientId}`}
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo processo
        </Link>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {cases.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhum processo cadastrado para este cliente.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {cases.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <Link
                    href={`/processos/${c.id}`}
                    className="font-medium text-kmp-graphite hover:text-kmp-orange"
                  >
                    {serviceTypeName(c.service_type_id)}
                  </Link>
                  <p className="text-kmp-graphite/60">
                    {c.etapa_id ? (stagesById[c.etapa_id]?.nome ?? "—") : "Sem etapa"}
                  </p>
                </div>
                <span className="rounded-full bg-kmp-graphite/10 px-2.5 py-0.5 text-xs font-medium text-kmp-graphite">
                  {CASE_STATUS_LABELS[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
