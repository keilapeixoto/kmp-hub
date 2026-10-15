import Link from "next/link";
import { Briefcase, ListChecks, Plus } from "lucide-react";
import { DEGRADE, Etiqueta, FaixaTitulo, type CorViva } from "@/components/ui/vivid";
import type { Case, CaseStage } from "@/lib/cases/types";
import type { ProcessoDoPerfil, TarefaDoPerfil } from "@/lib/clients/perfil";
import { iniciais, prazoRelativo } from "@/lib/clients/perfil-calc";
import { TASK_STATUS_LABELS } from "@/lib/tasks/constants";

// Corpo da aba Resumo do perfil do cliente: processos em cartões (o
// "abertos recentemente" da referência) e as tarefas do cliente.

const COR_DO_STATUS: Record<string, CorViva> = {
  ativo: "verde",
  pausado: "amarelo",
  concluido: "azul",
  cancelado: "cinza",
};

const COR_DA_TAREFA: Record<string, CorViva> = {
  pendente: "azul",
  em_andamento: "amarelo",
  concluida: "verde",
  cancelada: "cinza",
};

function Barra({ label, valor }: { label: string; valor: number | null }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-kmp-text/60">
        <span>{label}</span>
        <span className="font-semibold text-kmp-text/80">{valor === null ? "—" : `${valor}%`}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-kmp-text/10">
        <div className="h-2 rounded-full bg-kmp-orange" style={{ width: `${valor ?? 0}%` }} />
      </div>
    </div>
  );
}

export function ClientProcessCards({
  cases,
  processos,
  serviceNameById,
  stagesById,
  statusLabels,
  hoje,
}: {
  cases: Case[];
  processos: Record<string, ProcessoDoPerfil>;
  serviceNameById: Record<string, string>;
  stagesById: Record<string, CaseStage>;
  statusLabels: Record<string, string>;
  hoje: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo
        titulo="Processos"
        cor="verde"
        icon={Briefcase}
        direita={`${cases.length} ${cases.length === 1 ? "processo" : "processos"}`}
      />
      {cases.length === 0 ? (
        <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">
          Este cliente ainda não tem processo.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cases.map((c) => {
            const p = processos[c.id];
            const cor = COR_DO_STATUS[c.status] ?? "cinza";
            const prazo = prazoRelativo(c.prazo, hoje);
            const etapa = c.etapa_id ? stagesById[c.etapa_id]?.nome : null;
            return (
              <Link
                key={c.id}
                href={`/processos/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-kmp-divider bg-kmp-surface transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`bg-gradient-to-br ${DEGRADE[cor]} px-4 py-3 text-white`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-base font-semibold leading-snug">
                      {serviceNameById[c.service_type_id] ?? "Processo"}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold">
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/85">{etapa ? `Etapa: ${etapa}` : "Sem etapa definida"}</p>
                </div>
                <div className="space-y-3 px-4 py-3">
                  <Barra label="Checklist" valor={p?.checklistPct ?? null} />
                  <Barra label="Formulário" valor={p?.formularioPct ?? null} />
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {p && p.pendentesCliente > 0 ? (
                      <Etiqueta cor="laranja">
                        {p.pendentesCliente} {p.pendentesCliente === 1 ? "documento" : "documentos"} com o cliente
                      </Etiqueta>
                    ) : null}
                    {p?.formularioStatus === "enviado" ? <Etiqueta cor="azul">Formulário enviado</Etiqueta> : null}
                    {prazo ? (
                      <Etiqueta cor={prazo.atrasado ? "vermelho" : "cinza"}>Prazo {prazo.texto}</Etiqueta>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ClientTasks({
  clientId,
  tarefas,
  staffNameById,
  hoje,
}: {
  clientId: string;
  tarefas: TarefaDoPerfil[];
  staffNameById: Record<string, string>;
  hoje: string;
}) {
  const abertas = tarefas.filter((t) => t.status === "pendente" || t.status === "em_andamento").length;
  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo
        titulo="Tarefas"
        cor="azul"
        icon={ListChecks}
        direita={`${abertas} em aberto`}
      />
      {tarefas.length === 0 ? (
        <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">Nenhuma tarefa para este cliente.</p>
      ) : (
        <div>
          <div className="hidden grid-cols-[1fr_8.5rem_9rem_7.5rem] gap-3 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/50 sm:grid">
            <span>Tarefa</span>
            <span>Status</span>
            <span>Responsável</span>
            <span>Prazo</span>
          </div>
          <ul className="divide-y divide-kmp-divider">
            {tarefas.map((t) => {
              const prazo = prazoRelativo(t.prazo, hoje);
              const aberta = t.status === "pendente" || t.status === "em_andamento";
              const nome = staffNameById[t.responsavel] ?? "—";
              return (
                <li key={t.id}>
                  <Link
                    href={`/tarefas/${t.id}`}
                    className="grid grid-cols-1 gap-2 rounded-xl px-3 py-2.5 transition hover:bg-kmp-text/5 sm:grid-cols-[1fr_8.5rem_9rem_7.5rem] sm:items-center sm:gap-3"
                  >
                    <span className={`text-sm font-medium ${aberta ? "text-kmp-text" : "text-kmp-text/50 line-through"}`}>
                      {t.titulo}
                    </span>
                    <span>
                      <Etiqueta cor={COR_DA_TAREFA[t.status] ?? "cinza"}>
                        {TASK_STATUS_LABELS[t.status] ?? t.status}
                      </Etiqueta>
                    </span>
                    <span className="flex items-center gap-2 text-sm text-kmp-text/80">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kmp-text/10 text-xs font-semibold text-kmp-text/70"
                      >
                        {iniciais(nome)}
                      </span>
                      <span className="truncate">{nome}</span>
                    </span>
                    <span
                      className={`text-sm ${prazo?.atrasado && aberta ? "font-semibold text-[#b0283b] dark:text-[#f4a3ae]" : "text-kmp-text/70"}`}
                    >
                      {prazo ? prazo.texto : "sem prazo"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Link
        href={`/tarefas/nova?cliente=${clientId}`}
        className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-kmp-text/60 transition hover:bg-kmp-text/5 hover:text-kmp-text"
      >
        <Plus className="h-4 w-4" />
        Nova tarefa para este cliente
      </Link>
    </section>
  );
}
