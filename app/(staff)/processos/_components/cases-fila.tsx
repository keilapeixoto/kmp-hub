import Link from "next/link";
import { CASE_PRIORITY_LABELS } from "@/lib/cases/constants";
import { getCaseStatusLabels } from "@/lib/cases/data";
import type { Case, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";

const PRIORITY_RANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

const PRIORITY_DOT: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-amber-500",
  baixa: "bg-kmp-graphite/30",
};

type QueueSlug = "todos" | "alta" | "atrasados" | "pausados" | "concluidos";

const QUEUE_TABS: { slug: QueueSlug; label: string }[] = [
  { slug: "todos", label: "Todos" },
  { slug: "alta", label: "Prioridade alta" },
  { slug: "atrasados", label: "Atrasados" },
  { slug: "pausados", label: "Pausados" },
  { slug: "concluidos", label: "Concluídos" },
];

function isOverdue(c: Case): boolean {
  if (!c.prazo || c.status !== "ativo") return false;
  return new Date(c.prazo) < new Date(new Date().toDateString());
}

function filterByQueue(cases: Case[], queue: QueueSlug): Case[] {
  switch (queue) {
    case "alta":
      return cases.filter((c) => c.prioridade === "alta" && c.status === "ativo");
    case "atrasados":
      return cases.filter(isOverdue);
    case "pausados":
      return cases.filter((c) => c.status === "pausado");
    case "concluidos":
      return cases.filter((c) => c.status === "concluido");
    case "todos":
    default:
      return cases.filter((c) => c.status === "ativo" || c.status === "pausado");
  }
}

export async function CasesFila({
  cases,
  clients,
  consultants,
  serviceTypes,
  queue,
  baseHref,
}: {
  cases: Case[];
  clients: Client[];
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
  queue: QueueSlug;
  baseHref: string;
}) {
  const statusLabels = await getCaseStatusLabels();
  const clientName = (id: string) => clients.find((c) => c.id === id)?.nome ?? "—";
  const consultantName = (id: string) => consultants.find((c) => c.user_id === id)?.nome ?? "—";
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";

  const queued = filterByQueue(cases, queue);

  const groups = new Map<string, Case[]>();
  for (const c of queued) {
    const key = serviceTypeName(c.service_type_id);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.prioridade] - PRIORITY_RANK[b.prioridade];
      if (rankDiff !== 0) return rankDiff;
      if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo);
      if (a.prazo) return -1;
      if (b.prazo) return 1;
      return clientName(a.client_id).localeCompare(clientName(b.client_id), "pt-BR");
    });
  }
  const sortedGroupNames = [...groups.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        {QUEUE_TABS.map((tab) => (
          <Link
            key={tab.slug}
            href={`${baseHref}&fila=${tab.slug}`}
            className={`rounded-full border px-3 py-1 font-medium transition ${
              queue === tab.slug
                ? "border-kmp-orange bg-kmp-orange text-white"
                : "border-black/10 text-kmp-graphite/70 hover:border-kmp-orange hover:text-kmp-orange"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {queued.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Nenhum processo nessa fila.
        </p>
      ) : (
        sortedGroupNames.map((groupName) => {
          const groupCases = groups.get(groupName)!;
          return (
            <div key={groupName}>
              <h3 className="mb-2 text-sm font-semibold text-kmp-graphite">
                {groupName}{" "}
                <span className="font-normal text-kmp-graphite/50">({groupCases.length})</span>
              </h3>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                <ul className="divide-y divide-black/5">
                  {groupCases.map((c) => {
                    const overdue = isOverdue(c);
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/processos/${c.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-black/[0.02]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[c.prioridade] ?? "bg-kmp-graphite/30"}`}
                              title={`Prioridade ${CASE_PRIORITY_LABELS[c.prioridade] ?? c.prioridade}`}
                            />
                            <span className="truncate font-medium text-kmp-graphite">
                              {clientName(c.client_id)}
                            </span>
                            <span className="shrink-0 text-xs text-kmp-graphite/50">
                              {consultantName(c.consultor_id)}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-xs">
                            <span className="text-kmp-graphite/60">
                              {statusLabels[c.status] ?? c.status}
                            </span>
                            <span
                              className={
                                overdue
                                  ? "rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700"
                                  : "text-kmp-graphite/60"
                              }
                            >
                              {c.prazo
                                ? new Date(c.prazo).toLocaleDateString("pt-BR")
                                : "Sem prazo"}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
