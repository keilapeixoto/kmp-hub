import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getInvoicePeriods, getInvoiceSummary, getInvoices } from "@/lib/invoices/data";
import { INVOICE_STATUSES } from "@/lib/invoices/constants";
import { InvoiceStatusSelect } from "./_components/invoice-status-select";

const MESES_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatMoeda(value: number, moeda: string): string {
  const locale = moeda === "BRL" ? "pt-BR" : "en-AU";
  const prefix = moeda === "BRL" ? "R$ " : "AUD $";
  return prefix + value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function periodoLabel(periodo: string): string {
  const [ano, mes] = periodo.split("-").map(Number);
  return `${MESES_PT[mes - 1]}/${ano}`;
}

// Monta a URL da aba/filtro preservando os outros parâmetros já ativos.
function hrefComFiltros(
  atual: { q: string; status: string; periodo: string },
  override: Partial<{ q: string; status: string; periodo: string }>,
): string {
  const params = new URLSearchParams();
  const combinado = { ...atual, ...override };
  if (combinado.q) params.set("q", combinado.q);
  if (combinado.status) params.set("status", combinado.status);
  if (combinado.periodo) params.set("periodo", combinado.periodo);
  const qs = params.toString();
  return qs ? `/financeiro?${qs}` : "/financeiro";
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
  const periodo = firstValue(params.periodo) ?? "";
  const filtrosAtuais = { q, status, periodo };

  const invoices = await getInvoices({ status, q, periodo });
  const summary = await getInvoiceSummary();
  const periodos = await getInvoicePeriods();

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

      {periodos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={hrefComFiltros(filtrosAtuais, { periodo: "" })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !periodo
                ? "border-kmp-orange bg-kmp-orange text-white"
                : "border-black/10 text-kmp-graphite/70 hover:border-kmp-orange hover:text-kmp-orange"
            }`}
          >
            Todos os meses
          </Link>
          {periodos.map((p) => (
            <Link
              key={p}
              href={hrefComFiltros(filtrosAtuais, { periodo: p })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                periodo === p
                  ? "border-kmp-orange bg-kmp-orange text-white"
                  : "border-black/10 text-kmp-graphite/70 hover:border-kmp-orange hover:text-kmp-orange"
              }`}
            >
              {periodoLabel(p)}
            </Link>
          ))}
        </div>
      ) : null}

      <form
        method="GET"
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <input type="hidden" name="periodo" value={periodo} />
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
          {q || status || periodo ? (
            <Link
              href="/financeiro"
              className="ml-3 text-sm text-kmp-graphite/70 hover:text-kmp-orange"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        {invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-kmp-graphite/60">
            Nenhuma invoice encontrada.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs font-semibold uppercase tracking-wide text-kmp-graphite/50">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Nº invoice</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-black/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 text-kmp-graphite/70">
                    {formatData(inv.data_emissao)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/financeiro/${inv.id}`}
                      className="font-medium text-kmp-graphite hover:text-kmp-orange"
                    >
                      {inv.client_nome}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-kmp-graphite/70">
                    {inv.numero}
                  </td>
                  <td className="px-4 py-3 text-kmp-graphite/70">
                    {inv.servico_referente ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-heading font-bold text-kmp-graphite">
                    {formatMoeda(inv.total, inv.moeda)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <InvoiceStatusSelect invoiceId={inv.id} status={inv.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
