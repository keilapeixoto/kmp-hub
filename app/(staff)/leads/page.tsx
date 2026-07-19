import Link from "next/link";
import { getConsultants, getDistinctLeadValues, getLeads } from "@/lib/leads/data";
import type { LeadFilters } from "@/lib/leads/types";
import { LeadsFilters } from "./_components/leads-filters";
import { LeadsKanban } from "./_components/leads-kanban";
import { LeadsTable } from "./_components/leads-table";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = firstValue(params.view) === "kanban" ? "kanban" : "list";

  const filters: LeadFilters = {
    consultor: firstValue(params.consultor),
    servico: firstValue(params.servico),
    origem: firstValue(params.origem),
    pais: firstValue(params.pais),
    status: firstValue(params.status),
    de: firstValue(params.de),
    ate: firstValue(params.ate),
  };

  const [leads, consultants, origens, servicos, paises] = await Promise.all([
    getLeads(filters),
    getConsultants(),
    getDistinctLeadValues("origem"),
    getDistinctLeadValues("servico_interesse"),
    getDistinctLeadValues("pais"),
  ]);

  const queryString = new URLSearchParams(
    Object.entries(filters).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();
  const suffix = queryString ? `&${queryString}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Leads</h1>
        <Link
          href="/leads/novo"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo lead
        </Link>
      </div>

      <LeadsFilters
        filters={filters}
        view={view}
        consultants={consultants}
        origens={origens}
        servicos={servicos}
        paises={paises}
      />

      <div className="flex gap-2 text-sm">
        <Link
          href={`/leads?view=list${suffix}`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            view === "list"
              ? "bg-kmp-graphite text-white"
              : "bg-white text-kmp-graphite/70 hover:text-kmp-orange"
          }`}
        >
          Lista
        </Link>
        <Link
          href={`/leads?view=kanban${suffix}`}
          className={`rounded-md px-3 py-1.5 font-medium ${
            view === "kanban"
              ? "bg-kmp-graphite text-white"
              : "bg-white text-kmp-graphite/70 hover:text-kmp-orange"
          }`}
        >
          Kanban
        </Link>
      </div>

      {view === "kanban" ? (
        <LeadsKanban leads={leads} consultants={consultants} />
      ) : (
        <LeadsTable leads={leads} consultants={consultants} />
      )}
    </div>
  );
}
