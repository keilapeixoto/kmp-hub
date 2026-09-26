import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoice } from "@/lib/invoices/data";
import { getClient } from "@/lib/clients/data";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import type { InvoiceStatus } from "@/lib/invoices/types";
import { InvoicePdfButton } from "../_components/invoice-pdf-button";
import { updateInvoiceStatus } from "../actions";

// Controle manual: qualquer status pode virar qualquer outro — é a equipe
// "dando baixa" à mão (paga/pendente/cancelada), não um fluxo travado.
const ALL_STATUSES: InvoiceStatus[] = [
  "rascunho",
  "enviada",
  "paga",
  "vencida",
  "cancelada",
];

// Uma cor por status, e o status atual aparece preenchido (não só em texto) —
// os outros 4 ficam sempre visíveis como pílulas clicáveis pra trocar.
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "finance") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const client = await getClient(invoice.client_id);
  const statusLabel = (slug: string) =>
    INVOICE_STATUSES.find((s) => s.slug === slug)?.label ?? slug;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/financeiro"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Financeiro
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-heading text-2xl text-kmp-graphite">
            {invoice.numero}
          </h1>
          {invoice.status === "rascunho" ? (
            <Link
              href={`/financeiro/${invoice.id}/editar`}
              className="text-sm font-medium text-kmp-orange hover:underline"
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-kmp-graphite/50">
          Clique em um status pra atualizar (dar baixa manual)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ALL_STATUSES.map((s) => {
            const isActive = s === invoice.status;
            const style = STATUS_STYLE[s];
            return isActive ? (
              <span
                key={s}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${style.active}`}
              >
                {statusLabel(s)}
              </span>
            ) : (
              <form key={s} action={updateInvoiceStatus.bind(null, invoice.id, s)}>
                <button
                  type="submit"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${style.inactive}`}
                >
                  {statusLabel(s)}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <InvoicePdfButton invoice={invoice} client={client} />
    </div>
  );
}
