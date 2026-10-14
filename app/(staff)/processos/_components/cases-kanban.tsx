"use client";

import Link from "next/link";
import { ArrowRight, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Case, CaseStage } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import { updateCaseEtapa } from "../actions";

// Etapas: uma cor viva por posição, na ordem dos atalhos do Início.
const ETAPA_CORES = [
  "from-[#5f92f2] to-kmp-config-deep",
  "from-[#45b4c5] to-kmp-leads-deep",
  "from-[#9184f2] to-kmp-clientes-deep",
  "from-[#f0c040] to-kmp-agenda-deep",
  "from-[#e8679a] to-kmp-finance-deep",
  "from-[#bd72ae] to-kmp-documentos-deep",
  "from-[#45c285] to-kmp-processos-deep",
  "from-kmp-orange to-kmp-orange-deep",
];

export function CasesKanban({
  cases: initialCases,
  stages,
  clients,
  consultants,
}: {
  cases: Case[];
  stages: CaseStage[];
  clients: Client[];
  consultants: ConsultantOption[];
}) {
  const [cases, setCases] = useState(initialCases);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.nome ?? "—";
  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";

  function handleDrop(etapaId: string, caseId: string) {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, etapa_id: etapaId } : c)),
    );
    startTransition(async () => {
      await updateCaseEtapa(caseId, etapaId);
      router.refresh();
    });
  }

  const semEtapa = cases.filter((c) => !c.etapa_id);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage, i) => {
        const stageCases = cases.filter((c) => c.etapa_id === stage.id);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const caseId = e.dataTransfer.getData("text/case-id");
              if (caseId) handleDrop(stage.id, caseId);
            }}
            className="flex w-64 shrink-0 flex-col rounded-3xl bg-kmp-surface p-2.5 shadow-sm"
          >
            <h3
              className={`mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-br px-3.5 py-3 font-heading text-sm font-semibold text-white shadow-md ${
                ETAPA_CORES[i % ETAPA_CORES.length]
              }`}
            >
              {stage.nome}
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold">
                {stageCases.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {stageCases.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/case-id", c.id)}
                  className="rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10 dark:ring-white/10"
                >
                  {/* Nome do cliente abre o cadastro dele (aba Dados) para editar. */}
                  <Link
                    href={`/clientes/${c.client_id}?tab=dados`}
                    title="Abrir o cadastro do cliente"
                    className="group flex items-center gap-1.5 font-semibold text-kmp-text hover:text-kmp-orange"
                  >
                    {clientName(c.client_id)}
                    <PencilLine className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                  </Link>
                  <p className="mt-1 text-xs text-kmp-text/60">{consultantName(c.consultor_id)}</p>
                  <Link
                    href={`/processos/${c.id}`}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-kmp-text/5 px-2.5 py-1 text-xs font-semibold text-kmp-text/80 hover:bg-kmp-text/10"
                  >
                    Abrir processo <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
              {stageCases.length === 0 ? (
                <p className="rounded-md border border-dashed border-kmp-divider p-3 text-center text-xs text-kmp-text/40">
                  Vazio
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      {semEtapa.length > 0 ? (
        <div className="flex w-64 shrink-0 flex-col rounded-3xl bg-kmp-surface p-2.5 shadow-sm">
          <h3 className="mb-3 font-heading text-sm text-kmp-text">
            Sem etapa
          </h3>
          <div className="flex flex-col gap-2">
            {semEtapa.map((c) => (
              <Link
                key={c.id}
                href={`/processos/${c.id}`}
                className="block rounded-md bg-kmp-surface p-3 text-sm shadow-sm dark:border dark:border-white/10 dark:bg-white/10"
              >
                {clientName(c.client_id)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
