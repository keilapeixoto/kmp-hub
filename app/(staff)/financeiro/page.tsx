import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoices } from "@/lib/invoices/data";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Mesmas cores por status da tela de detalhe (financeiro/[id]).
const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-kmp-graphite/10 text-kmp-graphite/70",
  enviada: "bg-blue-50 text-blue-700",
  paga: "bg-green-50 text-green-700",
  vencida: "bg-amber-50 text-amber-700",
  cancelada: "bg-red-50 text-red-700",
};

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
              <li key={inv.id} className="p-4 text-sm">
                <Link
                  href={`/financeiro/${inv.id}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-kmp-graphite">
                      {inv.numero} · {inv.client_nome}
                    </p>
                    <p className="mt-1 text-xs text-kmp-graphite/50">
                      {inv.servico_referente ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-base font-bold text-kmp-graphite">
                      {inv.moeda === "BRL" ? "R$ " : "AUD $"}
                      {inv.total.toLocaleString(inv.moeda === "BRL" ? "pt-BR" : "en-AU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[inv.status] ?? "bg-kmp-graphite/10 text-kmp-graphite/70"
                      }`}
                    >
                      {INVOICE_STATUSES.find((s) => s.slug === inv.status)?.label ?? inv.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
