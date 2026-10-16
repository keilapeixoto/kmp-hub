"use client";

import Link from "next/link";
import { ArrowRight, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Case, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import { colunasPadrao, destaqueDoVencimento, etapaDoVisto, type EtapaComTipo } from "@/lib/cases/pipeline-padrao";
import { updateCaseEtapa } from "../actions";

// Pipeline com todos os vistos juntos, por etapa (out/2026: as etapas são
// padrão em todos os vistos). Arrastar um card leva o processo para a etapa
// de mesmo nome no visto dele. Só processos em andamento (ativo/pausado);
// concluídos e cancelados ficam na Lista.

const CORES = [
  "from-[#5f92f2] to-kmp-config-deep",
  "from-[#45b4c5] to-kmp-leads-deep",
  "from-[#9184f2] to-kmp-clientes-deep",
  "from-[#bd72ae] to-kmp-documentos-deep",
  "from-[#e8679a] to-kmp-finance-deep",
  "from-kmp-orange to-kmp-orange-deep",
  "from-[#f0c040] to-kmp-agenda-deep",
];

function corDaColuna(nome: string, i: number): string {
  if (/aprovado/i.test(nome)) return "from-[#45c285] to-kmp-processos-deep";
  if (/request|pedido/i.test(nome)) return "from-[#ef6b7d] to-kmp-alert-deep";
  return CORES[i % CORES.length];
}

const DESTAQUE = {
  vermelho: "bg-[#e5484d] text-white",
  laranja: "bg-kmp-orange text-white",
  amarelo: "bg-[#f0c040] text-[#4a2a00]",
  verde: "bg-[#2f9e6a] text-white",
} as const;

export function CasesOverviewKanban({
  cases: initialCases,
  clients,
  consultants,
  serviceTypes,
  etapas,
  hoje,
}: {
  cases: Case[];
  clients: Client[];
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
  etapas: EtapaComTipo[];
  hoje: string;
}) {
  const [cases, setCases] = useState(initialCases.filter((c) => c.status === "ativo" || c.status === "pausado"));
  const [aviso, setAviso] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const etapaPorId = new Map(etapas.map((e) => [e.id, e]));
  const colunas = [...colunasPadrao(etapas), "Sem etapa"];
  const cliente = (id: string) => clients.find((c) => c.id === id);
  const consultantName = (id: string) => consultants.find((c) => c.user_id === id)?.nome ?? "—";
  const serviceTypeName = (id: string) => serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";
  const colunaDo = (c: Case) => (c.etapa_id ? (etapaPorId.get(c.etapa_id)?.nome ?? "Sem etapa") : "Sem etapa");

  function handleDrop(coluna: string, caseId: string) {
    const caso = cases.find((c) => c.id === caseId);
    if (!caso || coluna === "Sem etapa" || colunaDo(caso) === coluna) return;
    const destino = etapaDoVisto(etapas, caso.service_type_id, coluna);
    if (!destino) {
      setAviso(`"${serviceTypeName(caso.service_type_id)}" não tem a etapa "${coluna}".`);
      return;
    }
    setAviso(null);
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, etapa_id: destino } : c)));
    startTransition(async () => {
      await updateCaseEtapa(caseId, destino);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {aviso ? <p className="rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900">{aviso}</p> : null}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((coluna, i) => {
          const daColuna = cases.filter((c) => colunaDo(c) === coluna);
          if (coluna === "Sem etapa" && daColuna.length === 0) return null;
          return (
            <div
              key={coluna}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const caseId = e.dataTransfer.getData("text/case-id");
                if (caseId) handleDrop(coluna, caseId);
              }}
              className="flex w-72 shrink-0 flex-col rounded-3xl bg-kmp-surface p-2.5 shadow-sm"
            >
              <h3
                className={`mb-3 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-br px-3.5 py-3 font-heading text-sm font-semibold text-white shadow-md ${
                  coluna === "Sem etapa" ? "from-[#a3a6ad] to-[#5f6268]" : corDaColuna(coluna, i)
                }`}
              >
                <span className="min-w-0">{coluna}</span>
                <span className="shrink-0 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold">{daColuna.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {daColuna.map((c) => {
                  const cl = cliente(c.client_id);
                  const venc = destaqueDoVencimento(cl?.visto_atual_validade, hoje);
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/case-id", c.id)}
                      className="cursor-grab overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:bg-white/10 dark:ring-white/10"
                    >
                      {venc ? (
                        <div className={`flex items-end justify-between gap-2 px-3 py-1.5 ${DESTAQUE[venc.cor]}`}>
                          <span className="leading-tight">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">
                              Visto atual{cl?.visto_atual_subclasse ? ` ${cl.visto_atual_subclasse}` : ""} vence
                            </span>
                            <span className="font-heading text-base font-bold">{venc.data}</span>
                          </span>
                          <span className="text-xs font-semibold">{venc.texto}</span>
                        </div>
                      ) : null}
                      <div className="p-3">
                        <Link
                          href={`/clientes/${c.client_id}?tab=dados`}
                          title="Abrir o cadastro do cliente"
                          className="group flex items-center gap-1.5 font-semibold text-kmp-text hover:text-kmp-orange"
                        >
                          {cl?.nome ?? "—"}
                          <PencilLine className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                        </Link>
                        <p className="mt-1 text-xs text-kmp-text/70">{serviceTypeName(c.service_type_id)}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-kmp-text/60">
                          {consultantName(c.consultor_id)}
                          {c.status === "pausado" ? (
                            <span className="rounded-full bg-[#fcf1cf] px-2 py-0.5 font-semibold text-[#7a5806]">Pausado</span>
                          ) : null}
                        </p>
                        <Link
                          href={`/processos/${c.id}`}
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-kmp-text/5 px-2.5 py-1 text-xs font-semibold text-kmp-text/80 hover:bg-kmp-text/10"
                        >
                          Abrir processo <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {daColuna.length === 0 ? (
                  <p className="rounded-md border border-dashed border-kmp-divider p-3 text-center text-xs text-kmp-text/40">
                    Vazio
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
