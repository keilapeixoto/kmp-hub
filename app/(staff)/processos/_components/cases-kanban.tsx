"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Case, CaseStage } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";
import { updateCaseEtapa } from "../actions";

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
      {stages.map((stage) => {
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
            className="flex w-64 shrink-0 flex-col rounded-lg bg-black/5 p-3"
          >
            <h3 className="mb-3 flex items-center justify-between font-heading text-sm text-kmp-graphite">
              {stage.nome}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-kmp-graphite/60">
                {stageCases.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {stageCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/processos/${c.id}`}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/case-id", c.id)
                  }
                  className="block rounded-md bg-white p-3 text-sm shadow-sm transition hover:shadow-md"
                >
                  <p className="font-medium text-kmp-graphite">
                    {clientName(c.client_id)}
                  </p>
                  <p className="mt-1 text-xs text-kmp-graphite/60">
                    {consultantName(c.consultor_id)}
                  </p>
                </Link>
              ))}
              {stageCases.length === 0 ? (
                <p className="rounded-md border border-dashed border-black/10 p-3 text-center text-xs text-kmp-graphite/40">
                  Vazio
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      {semEtapa.length > 0 ? (
        <div className="flex w-64 shrink-0 flex-col rounded-lg bg-black/5 p-3">
          <h3 className="mb-3 font-heading text-sm text-kmp-graphite">
            Sem etapa
          </h3>
          <div className="flex flex-col gap-2">
            {semEtapa.map((c) => (
              <Link
                key={c.id}
                href={`/processos/${c.id}`}
                className="block rounded-md bg-white p-3 text-sm shadow-sm"
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
