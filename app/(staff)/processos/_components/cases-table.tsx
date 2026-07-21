import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { CASE_PRIORITY_LABELS, CASE_STATUS_LABELS } from "@/lib/cases/constants";
import type { CaseStatus } from "@/lib/cases/constants";
import type { Case, CaseStage, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";

const STATUS_BADGE: Record<
  CaseStatus,
  { icon: typeof CircleDot; className: string }
> = {
  ativo: { icon: CircleDot, className: "bg-blue-50 text-blue-700" },
  pausado: { icon: PauseCircle, className: "bg-amber-50 text-amber-700" },
  concluido: { icon: CheckCircle2, className: "bg-green-50 text-green-700" },
  cancelado: { icon: XCircle, className: "bg-red-50 text-red-700" },
};

function StatusBadge({ status }: { status: CaseStatus }) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.ativo;
  const Icon = badge.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {CASE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function EtapaBadge({
  stage,
  isFirst,
  isLast,
}: {
  stage: CaseStage | undefined;
  isFirst: boolean;
  isLast: boolean;
}) {
  if (!stage) {
    return <span className="text-kmp-graphite/40">—</span>;
  }
  const className = isLast
    ? "bg-green-50 text-green-700"
    : isFirst
      ? "bg-kmp-graphite/10 text-kmp-graphite/70"
      : "bg-orange-50 text-kmp-orange";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {stage.nome}
    </span>
  );
}

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
    serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";

  if (cases.length === 0) {
    return (
      <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
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
        const firstStageId = stages[0]?.id;
        const lastStageId = stages[stages.length - 1]?.id;

        return (
          <div key={groupName}>
            <h3 className="mb-2 text-sm font-semibold text-kmp-graphite">
              {groupName}{" "}
              <span className="font-normal text-kmp-graphite/50">
                ({groupCases.length})
              </span>
            </h3>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
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
                    <tr key={c.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/processos/${c.id}`}
                          className="font-medium text-kmp-graphite hover:text-kmp-orange"
                        >
                          {clientName(c.client_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <EtapaBadge
                          stage={c.etapa_id ? stagesById[c.etapa_id] : undefined}
                          isFirst={c.etapa_id === firstStageId}
                          isLast={c.etapa_id === lastStageId}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
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
          </div>
        );
      })}
    </div>
  );
}
