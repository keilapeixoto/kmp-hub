import Link from "next/link";
import { Users } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import type { Client } from "@/lib/clients/types";
import { iniciais } from "@/lib/clients/perfil-calc";
import { ProcessoNaLista, ResponsavelNaLista } from "./linha-controles";

// Lista de clientes no mesmo visual do perfil (out/2026): linha com iniciais,
// nome e contato, país, processo em andamento e responsável.

export type ProcessoDaLista = {
  caseId: string;
  serviceTypeId: string;
  servico: string;
  status: string;
  etapa: string | null;
  etapaId: string | null;
};


export function ClientsTable({
  clients,
  staffNameById,
  processoPorCliente,
  statusLabels,
  etapasPorServico,
  servicos,
  podeTrocarResponsavel,
}: {
  clients: Client[];
  staffNameById: Record<string, string>;
  processoPorCliente: Record<string, { principal: ProcessoDaLista; total: number }>;
  statusLabels: Record<string, string>;
  etapasPorServico: Record<string, { id: string; nome: string }[]>;
  servicos: { id: string; nome: string }[];
  podeTrocarResponsavel: boolean;
}) {
  const equipe = Object.entries(staffNameById).map(([id, nome]) => ({ id, nome }));
  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo
        titulo="Clientes"
        cor="lilas"
        icon={Users}
        direita={`${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
      />
      {clients.length === 0 ? (
        <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">
          Nenhum cliente encontrado com esses filtros.
        </p>
      ) : (
        <div>
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,1fr)] gap-4 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/50 md:grid">
            <span>Cliente</span>
            <span>País</span>
            <span>Processo</span>
            <span>Responsável</span>
          </div>
          <ul className="divide-y divide-kmp-divider">
            {clients.map((client) => {
              const proc = processoPorCliente[client.id];
              return (
                <li
                  key={client.id}
                  className="grid grid-cols-1 gap-2 rounded-2xl px-3 py-3 transition hover:bg-kmp-text/5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:items-center md:gap-4"
                >
                  <Link href={`/clientes/${client.id}`} className="group flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#9184f2]/20 text-sm font-semibold text-[#4334b0] dark:text-[#cdc6fa]"
                    >
                      {iniciais(client.nome)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-kmp-text group-hover:text-kmp-orange">{client.nome}</span>
                      <span className="block truncate text-xs text-kmp-text/60">
                        {client.email ?? client.telefone ?? "Sem contato cadastrado"}
                      </span>
                    </span>
                  </Link>
                  <span className="text-sm text-kmp-text/75">{client.pais ?? "—"}</span>
                  <ProcessoNaLista
                    clientId={client.id}
                    processo={
                      proc
                        ? {
                            caseId: proc.principal.caseId,
                            servico: proc.principal.servico,
                            status: proc.principal.status,
                            etapaId: proc.principal.etapaId,
                            total: proc.total,
                          }
                        : null
                    }
                    etapas={proc ? (etapasPorServico[proc.principal.serviceTypeId] ?? []) : []}
                    servicos={servicos}
                    statusLabels={statusLabels}
                    vistoAplicado={client.visto_aplicado ?? null}
                  />
                  <ResponsavelNaLista
                    clientId={client.id}
                    atual={client.consultor_id}
                    equipe={equipe}
                    podeEditar={podeTrocarResponsavel}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
