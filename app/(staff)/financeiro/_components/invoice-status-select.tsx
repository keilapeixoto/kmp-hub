"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { updateInvoiceStatus } from "../actions";

// Mesma cor por status da tela de detalhe (invoice-status-control.tsx).
const STATUS_SELECT_STYLE: Record<InvoiceStatus, string> = {
  rascunho: "border-black/15 bg-black/5 text-kmp-graphite/70",
  enviada: "border-blue-200 bg-blue-50 text-blue-700",
  paga: "border-green-200 bg-green-50 text-green-700",
  vencida: "border-amber-200 bg-amber-50 text-amber-700",
  cancelada: "border-red-200 bg-red-50 text-red-700",
};

// Dá pra dar baixa direto na lista, sem entrar na invoice — mesma ação de
// updateInvoiceStatus da tela de detalhe, só que num <select> compacto por
// linha.
export function InvoiceStatusSelect({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: InvoiceStatus) {
    if (next === current) return;
    setError(null);
    const previous = current;
    setCurrent(next);
    setPending(true);
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, next);
        router.refresh();
      } catch (err) {
        setCurrent(previous);
        setError(
          err instanceof Error ? err.message : "Não foi possível atualizar o status.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end">
      <select
        value={current}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleChange(e.target.value as InvoiceStatus)}
        disabled={pending}
        aria-label="Status da invoice"
        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide disabled:opacity-50 ${STATUS_SELECT_STYLE[current]}`}
      >
        {INVOICE_STATUSES.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.label.toUpperCase()}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
