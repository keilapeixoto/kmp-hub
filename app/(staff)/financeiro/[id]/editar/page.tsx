import { notFound, redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoice } from "@/lib/invoices/data";
import { getClients } from "@/lib/clients/data";
import { getCases, getServiceTypes } from "@/lib/cases/data";
import { InvoiceForm } from "../../_components/invoice-form";
import { updateInvoice } from "../../actions";

export default async function EditarInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "finance") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [invoice, clients, cases, serviceTypes] = await Promise.all([
    getInvoice(id),
    getClients({}),
    getCases({}),
    getServiceTypes(),
  ]);
  if (!invoice) notFound();

  const boundAction = updateInvoice.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-kmp-graphite">
        Editar invoice {invoice.numero}
      </h1>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <InvoiceForm
          action={boundAction}
          invoice={invoice}
          clients={clients}
          cases={cases}
          serviceTypes={serviceTypes}
        />
      </div>
    </div>
  );
}
