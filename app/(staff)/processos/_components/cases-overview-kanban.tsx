"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CASE_STATUSES } from "@/lib/cases/constants";
import type { Case, ServiceType } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import { updateCaseStatusDrag } from "../actions";

const STATUS_COLUMN_STYLE: Record<string, string> = {
  ativo: "bg-blue-50",
  pausado: "bg-amber-50",
  concluido: "bg-green-50",
  cancelado: "bg-red-50",
};

/**
 * Visão geral arrastável de TODOS os processos, agrupada por status (não
 * por etapa — as etapas são específicas de cada tipo de serviço, então não
 * dá para misturar num board só). Para acompanhar etapa a etapa dentro de
 * um tipo específico, use o Kanban com o filtro "Tipo de serviço".
 */
export function CasesOverviewKanban({
  cases: initialCases,
  clients,
  consultants,
  serviceTypes,
}: {
  cases: Case[];
  clients: Client[];
  consultants: ConsultantOption[];
  serviceTypes: ServiceType[];
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
            className={`flex w-72 shrink-0 flex-col rounded-lg p-3 ${STATUS_COLUMN_STYLE[statusOpt.slug] ?? "bg-black/5"}`}
          >
            <h3 className="mb-3 flex items-center justify-between font-heading text-sm text-kmp-graphite">
              {statusOpt.label}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-kmp-graphite/60">
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
                  className="block rounded-md bg-white p-3 text-sm shadow-sm transition hover:shadow-md"
                >
                  <p className="font-medium text-kmp-graphite">
                    {clientName(c.client_id)}
                  </p>
                  <p className="mt-1 text-xs text-kmp-graphite/60">
                    {serviceTypeName(c.service_type_id)}
                  </p>
                  <p className="mt-0.5 text-xs text-kmp-graphite/50">
                    {consultantName(c.consultor_id)}
                  </p>
                </Link>
              ))}
              {statusCases.length === 0 ? (
                <p className="rounded-md border border-dashed border-black/10 p-3 text-center text-xs text-kmp-graphite/40">
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
