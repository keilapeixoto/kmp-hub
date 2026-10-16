import Link from "next/link";
import { getClients, getDistinctClientValues } from "@/lib/clients/data";
import {
  getAllCaseStages,
  getCases,
  getCaseStatusLabels,
  getServiceTypes,
  getTeamMembersStaff,
} from "@/lib/cases/data";
import type { ClientFilters } from "@/lib/clients/types";
import { ClientsFilters } from "./_components/clients-filters";
import { ClientsTable, type ProcessoDaLista } from "./_components/clients-table";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Processo que aparece na lista: o em andamento (ativo/pausado) mais recente;
// sem nenhum em andamento, o mais recente de todos.
const EM_ANDAMENTO = ["ativo", "pausado"];

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

  const [clients, staff, paises, situacoes, cases, serviceTypes, stages, statusLabels] = await Promise.all([
    getClients(filters),
    getTeamMembersStaff(),
    getDistinctClientValues("pais"),
    getDistinctClientValues("situacao"),
    getCases({}),
    getServiceTypes(),
    getAllCaseStages(),
    getCaseStatusLabels(),
  ]);

  const staffNameById = Object.fromEntries(staff.map((m) => [m.user_id, m.nome]));
  const servicoPorId = Object.fromEntries(serviceTypes.map((st) => [st.id, st.nome]));
  const etapaPorId = Object.fromEntries(stages.map((s) => [s.id, s.nome]));

  // getCases já vem do mais recente para o mais antigo.
  const processoPorCliente: Record<string, { principal: ProcessoDaLista; total: number }> = {};
  for (const c of cases) {
    const atual = processoPorCliente[c.client_id];
    const item: ProcessoDaLista = {
      servico: servicoPorId[c.service_type_id] ?? "Processo",
      status: c.status,
      etapa: c.etapa_id ? (etapaPorId[c.etapa_id] ?? null) : null,
    };
    if (!atual) {
      processoPorCliente[c.client_id] = { principal: item, total: 1 };
      continue;
    }
    atual.total += 1;
    if (!EM_ANDAMENTO.includes(atual.principal.status) && EM_ANDAMENTO.includes(c.status)) {
      atual.principal = item;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-text">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Novo cliente
        </Link>
      </div>

      <ClientsFilters
        filters={filters}
        responsaveis={staff.map((m) => ({ user_id: m.user_id, nome: m.nome }))}
        paises={paises}
        situacoes={situacoes}
      />

      <ClientsTable
        clients={clients}
        staffNameById={staffNameById}
        processoPorCliente={processoPorCliente}
        statusLabels={statusLabels}
      />
    </div>
  );
}
