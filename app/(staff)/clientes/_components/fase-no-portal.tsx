"use client";

import { useOptimistic, useTransition } from "react";
import { updateCaseEtapa } from "@/app/(staff)/processos/actions";

// Fase do processo que o cliente acompanha na linha do tempo do portal:
// clicar numa fase muda a etapa do processo (mesma etapa do Pipeline).
export function FaseNoPortal({
  caseId,
  etapaAtual,
  etapas,
}: {
  caseId: string;
  etapaAtual: string | null;
  etapas: { id: string; nome: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [atual, setAtual] = useOptimistic(etapaAtual);
  if (etapas.length === 0) return null;
  const idx = etapas.findIndex((e) => e.id === atual);

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/60">
        Fase que o cliente vê no portal {pending ? "· salvando…" : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {etapas.map((e, i) => {
          const feita = idx >= 0 && i < idx;
          const agora = i === idx;
          return (
            <button
              key={e.id}
              type="button"
              disabled={pending || agora}
              onClick={() =>
                startTransition(async () => {
                  setAtual(e.id);
                  await updateCaseEtapa(caseId, e.id);
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                agora
                  ? "bg-kmp-orange text-white shadow-sm"
                  : feita
                    ? "bg-[#dcf3e7] text-[#16673f] hover:opacity-80 dark:bg-[#45c285]/20 dark:text-[#a9e6c7]"
                    : "bg-kmp-text/5 text-kmp-text/75 hover:bg-kmp-text/10"
              }`}
            >
              {i + 1}. {e.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}
