import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoice } from "@/lib/invoices/data";
import { getClient } from "@/lib/clients/data";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import { InvoicePdfButton } from "../_components/invoice-pdf-button";
import { InvoiceStatusControl } from "../_components/invoice-status-control";

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

      <InvoiceStatusControl
        invoiceId={invoice.id}
        status={invoice.status}
        statusLabel={statusLabel}
      />

      <InvoicePdfButton invoice={invoice} client={client} />
    </div>
  );
}
