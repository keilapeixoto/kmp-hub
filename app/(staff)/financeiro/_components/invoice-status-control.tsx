"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { updateInvoiceStatus } from "../actions";

function statusLabel(slug: string): string {
  return INVOICE_STATUSES.find((s) => s.slug === slug)?.label ?? slug;
}

// Controle manual: qualquer status pode virar qualquer outro — é a equipe
// "dando baixa" à mão (paga/pendente/cancelada), não um fluxo travado.
const ALL_STATUSES: InvoiceStatus[] = [
  "rascunho",
  "enviada",
  "paga",
  "vencida",
  "cancelada",
];

// Uma cor por status, e o status atual aparece preenchido (não só em texto).
const STATUS_STYLE: Record<InvoiceStatus, { active: string; inactive: string }> = {
  rascunho: {
    active: "border-kmp-graphite bg-kmp-graphite text-white",
    inactive: "border-black/15 text-kmp-graphite/70 hover:bg-black/5",
  },
  enviada: {
    active: "border-blue-600 bg-blue-600 text-white",
    inactive: "border-blue-200 text-blue-700 hover:bg-blue-50",
  },
  paga: {
    active: "border-green-600 bg-green-600 text-white",
    inactive: "border-green-200 text-green-700 hover:bg-green-50",
  },
  vencida: {
    active: "border-amber-600 bg-amber-600 text-white",
    inactive: "border-amber-200 text-amber-700 hover:bg-amber-50",
  },
  cancelada: {
    active: "border-red-600 bg-red-600 text-white",
    inactive: "border-red-200 text-red-700 hover:bg-red-50",
  },
};

export function InvoiceStatusControl({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick(next: InvoiceStatus) {
    setError(null);
    setPendingStatus(next);
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, next);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível atualizar o status. Tente novamente.",
        );
      } finally {
        setPendingStatus(null);
      }
    });
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs text-kmp-graphite/50">
        Clique em um status pra atualizar (dar baixa manual)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {ALL_STATUSES.map((s) => {
          const isActive = s === status;
          const style = STATUS_STYLE[s];
          if (isActive) {
            return (
              <span
                key={s}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${style.active}`}
              >
                {statusLabel(s)}
              </span>
            );
          }
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleClick(s)}
              disabled={pending}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${style.inactive}`}
            >
              {pendingStatus === s ? "Atualizando…" : statusLabel(s)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
