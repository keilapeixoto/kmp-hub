import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getClients } from "@/lib/clients/data";
import { getCases, getServiceTypes } from "@/lib/cases/data";
import { InvoiceForm } from "../_components/invoice-form";
import { createInvoice } from "../actions";

export default async function NovaInvoicePage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "finance") {
    redirect("/dashboard");
  }

  const [clients, cases, serviceTypes] = await Promise.all([
    getClients({}),
    getCases({}),
    getServiceTypes(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-kmp-graphite">Nova invoice</h1>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <InvoiceForm
          action={createInvoice}
          clients={clients}
          cases={cases}
          serviceTypes={serviceTypes}
        />
      </div>
    </div>
  );
}
