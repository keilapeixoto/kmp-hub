"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CASE_STATUSES } from "@/lib/cases/constants";
import type { Case, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import { updateCaseStatusDrag } from "../actions";

// Cabeçalho de cada coluna em bloco colorido vivo, no mesmo degradê dos
// atalhos do Início (redesign âmbar, out/2026).
const STATUS_HEADER_STYLE: Record<string, string> = {
  ativo: "from-[#5f92f2] to-kmp-config-deep",
  pausado: "from-[#f0c040] to-kmp-agenda-deep",
  concluido: "from-[#45c285] to-kmp-processos-deep",
  cancelado: "from-[#ef6b7d] to-kmp-alert-deep",
  arquivado: "from-[#a3a6ad] to-[#5f6268]",
};

/**
 * Visão geral arrastável de TODOS os processos, agrupada por status (não
 * por etapa — as etapas são específicas de cada tipo de serviço, então não
 * dá para misturar num board só). Para acompanhar etapa a etapa dentro de
 * um tipo específico, use a Pipeline com o filtro "Tipo de serviço".
 */
export function CasesOverviewKanban({
  cases: initialCases,
  clients,
  consultants,
  serviceTypes,
  statusLabels,
}: {
  cases: Case[];
  clients: Client[];
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
  statusLabels: Record<string, string>;
}) {
  const [cases, setCases] = useState(initialCases);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.nome ?? "—";
  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";
  const serviceTypeName = (id: string) =>
    serviceTypes.find((st) => st.id === id)?.nome ?? "Sem tipo de serviço";

  function handleDrop(status: string, caseId: string) {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: status as Case["status"] } : c)),
    );
    startTransition(async () => {
      await updateCaseStatusDrag(caseId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CASE_STATUSES.map((statusOpt) => {
        const statusCases = cases.filter((c) => c.status === statusOpt.slug);
        return (
          <div
            key={statusOpt.slug}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const caseId = e.dataTransfer.getData("text/case-id");
              if (caseId) handleDrop(statusOpt.slug, caseId);
            }}
            className="flex w-72 shrink-0 flex-col rounded-3xl bg-kmp-surface p-2.5 shadow-sm"
          >
            <h3
              className={`mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-br px-3.5 py-3 font-heading text-sm font-semibold text-white shadow-md ${
                STATUS_HEADER_STYLE[statusOpt.slug] ?? "from-[#a3a6ad] to-[#5f6268]"
              }`}
            >
              {statusLabels[statusOpt.slug] ?? statusOpt.label}
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold">
                {statusCases.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {statusCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/processos/${c.id}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/case-id", c.id)}
                  className="block rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10 dark:ring-white/10 dark:hover:bg-white/15"
                >
                  <p className="font-medium text-kmp-text">
                    {clientName(c.client_id)}
                  </p>
                  <p className="mt-1 text-xs text-kmp-text/60">
                    {serviceTypeName(c.service_type_id)}
                  </p>
                  <p className="mt-0.5 text-xs text-kmp-text/50">
                    {consultantName(c.consultor_id)}
                  </p>
                </Link>
              ))}
              {statusCases.length === 0 ? (
                <p className="rounded-md border border-dashed border-kmp-divider p-3 text-center text-xs text-kmp-text/40">
                  Vazio
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
