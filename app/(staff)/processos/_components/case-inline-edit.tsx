"use client";

import { useTransition } from "react";
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/cases/constants";
import type { CaseStage } from "@/lib/cases/types";
import type { ConsultantOption } from "@/lib/leads/types";
import {
  updateCaseConsultorInline,
  updateCaseEtapa,
  updateCasePrazoInline,
  updateCasePrioridadeInline,
  updateCaseStatusDrag,
} from "../actions";

const STATUS_SELECT_STYLE: Record<string, string> = {
  ativo: "bg-blue-50 text-blue-700",
  pausado: "bg-amber-50 text-amber-700",
  concluido: "bg-green-50 text-green-700",
  cancelado: "bg-red-50 text-red-700",
  arquivado: "bg-gray-100 text-kmp-text/70",
};

const selectPillClass =
  "rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-kmp-orange disabled:opacity-60";
const selectPlainClass =
  "rounded-md border-0 bg-transparent px-1 py-0.5 text-xs font-medium text-kmp-text/70 focus:outline-none focus:ring-1 focus:ring-kmp-orange disabled:opacity-60";

// Pedido da Keila: dá pra trocar etapa/status/prioridade/consultor/prazo
// direto na lista (view=lista de /processos), sem abrir o processo — mesmo
// padrão de "dar baixa direto na lista" já usado em invoice-status-select.tsx
// e deadline-status-select.tsx.

export function CaseStatusSelect({
  caseId,
  status,
  statusLabels,
}: {
  caseId: string;
  status: string;
  statusLabels: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateCaseStatusDrag(caseId, value);
        });
      }}
      className={`${selectPillClass} ${STATUS_SELECT_STYLE[status] ?? STATUS_SELECT_STYLE.ativo}`}
    >
      {CASE_STATUSES.map((s) => (
        <option key={s.slug} value={s.slug}>
          {statusLabels[s.slug] ?? s.label}
        </option>
      ))}
    </select>
  );
}

export function CaseEtapaSelect({
  caseId,
  etapaId,
  stages,
}: {
  caseId: string;
  etapaId: string | null;
  stages: CaseStage[];
}) {
  const [pending, startTransition] = useTransition();
  const isFirst = stages.length > 0 && stages[0].id === etapaId;
  const isLast = stages.length > 0 && stages[stages.length - 1].id === etapaId;
  const colorClass = !etapaId
    ? "bg-gray-100 text-kmp-text/50"
    : isLast
      ? "bg-green-50 text-green-700"
      : isFirst
        ? "bg-kmp-graphite/10 text-kmp-text/70"
        : "bg-orange-50 text-orange-800";

  if (stages.length === 0) {
    return <span className="text-kmp-text/40">—</span>;
  }

  return (
    <select
      defaultValue={etapaId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        if (!value) return;
        startTransition(async () => {
          await updateCaseEtapa(caseId, value);
        });
      }}
      className={`${selectPillClass} ${colorClass}`}
    >
      {!etapaId ? <option value="">Sem etapa</option> : null}
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nome}
        </option>
      ))}
    </select>
  );
}

export function CasePrioridadeSelect({
  caseId,
  prioridade,
}: {
  caseId: string;
  prioridade: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={prioridade}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateCasePrioridadeInline(caseId, value);
        });
      }}
      className={selectPlainClass}
    >
      {CASE_PRIORITIES.map((p) => (
        <option key={p.slug} value={p.slug}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

export function CaseConsultorSelect({
  caseId,
  consultorId,
  consultants,
}: {
  caseId: string;
  consultorId: string | null;
  consultants: ConsultantOption[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={consultorId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateCaseConsultorInline(caseId, value);
        });
      }}
      className={selectPlainClass}
    >
      <option value="">—</option>
      {consultants.map((c) => (
        <option key={c.user_id} value={c.user_id}>
          {c.nome}
        </option>
      ))}
    </select>
  );
}

export function CasePrazoInput({
  caseId,
  prazo,
}: {
  caseId: string;
  prazo: string | null;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="date"
      defaultValue={prazo ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateCasePrazoInline(caseId, value);
        });
      }}
      className={selectPlainClass}
    />
  );
}
