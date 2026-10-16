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
import { getCurrentUserRole } from "@/lib/auth";
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
  const etapasPorServico: Record<string, { id: string; nome: string }[]> = {};
  for (const st of [...stages].sort((a, b) => a.ordem - b.ordem)) {
    (etapasPorServico[st.service_type_id] ??= []).push({ id: st.id, nome: st.nome });
  }
  const servicosAtivos = serviceTypes
    .filter((st) => !st.arquivado && !st.nome.startsWith("[DEMO]"))
    .map((st) => ({ id: st.id, nome: st.nome }));
  const role = await getCurrentUserRole();

  // getCases já vem do mais recente para o mais antigo.
  const processoPorCliente: Record<string, { principal: ProcessoDaLista; total: number }> = {};
  for (const c of cases) {
    const atual = processoPorCliente[c.client_id];
    const item: ProcessoDaLista = {
      caseId: c.id,
      serviceTypeId: c.service_type_id,
      servico: servicoPorId[c.service_type_id] ?? "Processo",
      status: c.status,
      etapa: c.etapa_id ? (etapaPorId[c.etapa_id] ?? null) : null,
      etapaId: c.etapa_id,
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
      {firstValue(params.excluido) ? (
        <p className="rounded-3xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">Cliente excluído.</p>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-text">Clientes</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/clientes/novo"
            className="rounded-full border border-kmp-divider px-4 py-2 text-sm font-medium text-kmp-text transition hover:border-kmp-orange"
          >
            Cadastro completo
          </Link>
          <Link
            href="/clientes/novo-portal"
            className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
          >
            Novo cliente com portal
          </Link>
        </div>
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
        etapasPorServico={etapasPorServico}
        servicos={servicosAtivos}
        podeTrocarResponsavel={role === "admin" || role === "director"}
      />
    </div>
  );
}
