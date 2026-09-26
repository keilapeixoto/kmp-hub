import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoiceSummary, getInvoices } from "@/lib/invoices/data";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import { InvoiceStatusSelect } from "./_components/invoice-status-select";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatMoeda(value: number, moeda: string): string {
  const locale = moeda === "BRL" ? "pt-BR" : "en-AU";
  const prefix = moeda === "BRL" ? "R$ " : "AUD $";
  return prefix + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "finance") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = firstValue(params.status) ?? "";
  const q = firstValue(params.q) ?? "";

  const invoices = await getInvoices({ status, q });
  const summary = await getInvoiceSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Financeiro</h1>
        <Link
          href="/financeiro/nova"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Nova invoice
        </Link>
      </div>

      <div className="space-y-4">
        {summary.map((row) => (
          <div key={row.moeda} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-kmp-graphite/50">
                Recebido no mês · {row.moeda}
              </p>
              <p className="mt-2 font-heading text-xl font-extrabold text-green-700">
                {formatMoeda(row.recebidoMes, row.moeda)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-kmp-graphite/50">
                Pendente a receber · {row.moeda}
              </p>
              <p className="mt-2 font-heading text-xl font-extrabold text-kmp-orange-deep">
                {formatMoeda(row.pendente, row.moeda)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por número ou cliente"
          aria-label="Buscar por número ou cliente"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange sm:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filtrar por status"
          className="rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        >
          <option value="">Todos os status</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Filtrar
          </button>
          {q || status ? (
            <Link
              href="/financeiro"
              className="ml-3 text-sm text-kmp-graphite/70 hover:text-kmp-orange"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="rounded-lg bg-white shadow-sm">
        {invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-kmp-graphite/60">
            Nenhuma invoice encontrada.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <Link href={`/financeiro/${inv.id}`} className="min-w-0 flex-1">
                  <p className="font-medium text-kmp-graphite">
                    {inv.numero} · {inv.client_nome}
                  </p>
                  <p className="mt-1 text-xs text-kmp-graphite/50">
                    {inv.servico_referente ?? "—"}
                  </p>
                </Link>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-base font-bold text-kmp-graphite">
                    {formatMoeda(inv.total, inv.moeda)}
                  </span>
                  <InvoiceStatusSelect invoiceId={inv.id} status={inv.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
