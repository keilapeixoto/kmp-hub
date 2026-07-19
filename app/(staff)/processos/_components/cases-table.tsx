import Link from "next/link";
import { CASE_PRIORITY_LABELS, CASE_STATUS_LABELS } from "@/lib/cases/constants";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";

export function CasesTable({
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
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.nome ?? "—";
  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "—";

  if (cases.length === 0) {
    return (
      <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
        Nenhum processo encontrado com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
          <tr>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Serviço</th>
            <th className="px-4 py-3 font-medium">Etapa</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Consultor</th>
            <th className="px-4 py-3 font-medium">Prazo</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/processos/${c.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {clientName(c.client_id)}
                </Link>
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {serviceTypeName(c.service_type_id)}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {c.etapa_id ? (stagesById[c.etapa_id]?.nome ?? "—") : "—"}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {CASE_STATUS_LABELS[c.status] ?? c.status}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {CASE_PRIORITY_LABELS[c.prioridade] ?? c.prioridade}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {consultantName(c.consultor_id)}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {c.prazo ? new Date(c.prazo).toLocaleDateString("pt-BR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
