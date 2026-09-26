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

const STATUS_BUTTON_STYLE: Record<InvoiceStatus, string> = {
  rascunho: "border-black/10 text-kmp-graphite hover:border-kmp-orange hover:text-kmp-orange",
  enviada: "border-black/10 text-kmp-graphite hover:border-kmp-orange hover:text-kmp-orange",
  paga: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  vencida: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  cancelada: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-kmp-graphite/60">
            Status atual: <span className="font-medium text-kmp-graphite">{statusLabel(invoice.status)}</span>
          </span>
          {ALL_STATUSES.filter((next) => next !== invoice.status).map((next) => (
            <form key={next} action={updateInvoiceStatus.bind(null, invoice.id, next)}>
              <button
                type="submit"
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${STATUS_BUTTON_STYLE[next]}`}
              >
                Marcar como {statusLabel(next).toLowerCase()}
              </button>
            </form>
          ))}
        </div>
      </div>

      <InvoicePdfButton invoice={invoice} client={client} />
    </div>
  );
}
