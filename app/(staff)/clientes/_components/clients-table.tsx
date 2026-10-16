import Link from "next/link";
import { Users } from "lucide-react";
import { Etiqueta, FaixaTitulo, type CorViva } from "@/components/ui/vivid";
import type { Client } from "@/lib/clients/types";
import { iniciais } from "@/lib/clients/perfil-calc";

// Lista de clientes no mesmo visual do perfil (out/2026): linha com iniciais,
// nome e contato, país, processo em andamento e responsável.

export type ProcessoDaLista = {
  servico: string;
  status: string;
  etapa: string | null;
};

const COR_DO_STATUS: Record<string, CorViva> = {
  ativo: "verde",
  pausado: "amarelo",
  concluido: "azul",
  cancelado: "cinza",
};

export function ClientsTable({
  clients,
  staffNameById,
  processoPorCliente,
  statusLabels,
}: {
  clients: Client[];
  staffNameById: Record<string, string>;
  processoPorCliente: Record<string, { principal: ProcessoDaLista; total: number }>;
  statusLabels: Record<string, string>;
}) {
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
              const responsavel = staffNameById[client.consultor_id] ?? "—";
              return (
                <li key={client.id}>
                  <Link
                    href={`/clientes/${client.id}`}
                    className="grid grid-cols-1 gap-2 rounded-2xl px-3 py-3 transition hover:bg-kmp-text/5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:items-center md:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#9184f2]/20 text-sm font-semibold text-[#4334b0] dark:text-[#cdc6fa]"
                      >
                        {iniciais(client.nome)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-kmp-text">{client.nome}</span>
                        <span className="block truncate text-xs text-kmp-text/60">
                          {client.email ?? client.telefone ?? "Sem contato cadastrado"}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm text-kmp-text/75">{client.pais ?? "—"}</span>
                    <span className="min-w-0">
                      {proc ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-kmp-text">{proc.principal.servico}</span>
                          <Etiqueta cor={COR_DO_STATUS[proc.principal.status] ?? "cinza"}>
                            {statusLabels[proc.principal.status] ?? proc.principal.status}
                          </Etiqueta>
                          {proc.total > 1 ? (
                            <span className="text-xs text-kmp-text/60">+{proc.total - 1}</span>
                          ) : null}
                          {proc.principal.etapa ? (
                            <span className="block w-full truncate text-xs text-kmp-text/60">
                              {proc.principal.etapa}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-sm text-kmp-text/50">Sem processo</span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-sm text-kmp-text/80">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kmp-text/10 text-xs font-semibold text-kmp-text/70"
                      >
                        {iniciais(responsavel)}
                      </span>
                      <span className="truncate">{responsavel}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
