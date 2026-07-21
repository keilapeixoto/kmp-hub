import Link from "next/link";
import { getConsultants } from "@/lib/leads/data";
import { getClients } from "@/lib/clients/data";
import {
  getAllCaseStages,
  getCases,
  getServiceTypes,
} from "@/lib/cases/data";
import type { CaseFilters } from "@/lib/cases/types";
import { CasesFilters } from "./_components/cases-filters";
import { CasesKanban } from "./_components/cases-kanban";
import { CasesOverviewKanban } from "./_components/cases-overview-kanban";
import { CasesTable } from "./_components/cases-table";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = firstValue(params.view) === "kanban" ? "kanban" : "list";

  const filters: CaseFilters = {
    consultor: firstValue(params.consultor),
    servicoTipo: firstValue(params.servicoTipo),
    status: firstValue(params.status),
    prioridade: firstValue(params.prioridade),
  };

  const [cases, consultants, clients, serviceTypes, allStages] =
    await Promise.all([
      getCases(filters),
      getConsultants(),
      getClients({}),
      getServiceTypes(),
      getAllCaseStages(),
    ]);

  const stagesById = Object.fromEntries(allStages.map((s) => [s.id, s]));

  const queryString = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();
  const suffix = queryString ? `&${queryString}` : "";

  const kanbanStages = filters.servicoTipo
    ? allStages.filter((s) => s.service_type_id === filters.servicoTipo)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Processos
        </h1>
        <Link
          href="/processos/novo"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo processo
        </Link>
      </div>

      <CasesFilters
        filters={filters}
        view={view}
        consultants={consultants}
        serviceTypes={serviceTypes}
      />

      <div className="flex gap-2 text-sm">
        <Link
          href={`/processos?view=list${suffix}`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            view === "list"
              ? "bg-kmp-graphite text-white"
              : "bg-white text-kmp-graphite/70 hover:text-kmp-orange"
          }`}
        >
          Lista
        </Link>
        <Link
          href={`/processos?view=kanban${suffix}`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            view === "kanban"
              ? "bg-kmp-graphite text-white"
              : "bg-white text-kmp-graphite/70 hover:text-kmp-orange"
          }`}
        >
          Pipeline
        </Link>
      </div>

      {view === "kanban" ? (
        filters.servicoTipo ? (
          <CasesKanban
            cases={cases}
            stages={kanbanStages}
            clients={clients}
            consultants={consultants}
          />
        ) : (
          <>
            <p className="text-sm text-kmp-graphite/60">
              Visão geral por status, com todos os tipos de serviço juntos —
              arraste os cards entre as colunas. Para acompanhar etapa a
              etapa de um tipo específico (485, Turista, etc.), escolha-o no
              filtro &quot;Tipo de serviço&quot; acima.
            </p>
            <CasesOverviewKanban
              cases={cases}
              clients={clients}
              consultants={consultants}
              serviceTypes={serviceTypes}
            />
          </>
        )
      ) : (
        <CasesTable
          cases={cases}
          clients={clients}
          consultants={consultants}
          serviceTypes={serviceTypes}
          stagesById={stagesById}
        />
      )}
    </div>
  );
}
