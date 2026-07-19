import Link from "next/link";
import { getConsultants } from "@/lib/leads/data";
import { getClients, getDistinctClientValues } from "@/lib/clients/data";
import type { ClientFilters } from "@/lib/clients/types";
import { ClientsFilters } from "./_components/clients-filters";
import { ClientsTable } from "./_components/clients-table";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const filters: ClientFilters = {
    consultor: firstValue(params.consultor),
    pais: firstValue(params.pais),
    situacao: firstValue(params.situacao),
    busca: firstValue(params.busca),
  };

  const [clients, consultants, paises, situacoes] = await Promise.all([
    getClients(filters),
    getConsultants(),
    getDistinctClientValues("pais"),
    getDistinctClientValues("situacao"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo cliente
        </Link>
      </div>

      <ClientsFilters
        filters={filters}
        consultants={consultants}
        paises={paises}
        situacoes={situacoes}
      />

      <ClientsTable clients={clients} consultants={consultants} />
    </div>
  );
}
