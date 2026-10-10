import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getMonthlyReport } from "@/lib/storage-admin/report";
import { formatBytes } from "@/lib/storage-admin/format";

function formatDelta(bytes: number | null): string {
  if (bytes === null) return "sem dado histórico ainda";
  return `${bytes > 0 ? "+" : ""}${formatBytes(bytes)}`;
}

export default async function StorageMonthlyReportPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  const r = await getMonthlyReport();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-text">
          Relatório mensal de armazenamento
        </h1>
        <p className="text-sm text-kmp-text/60">
          Calculado na hora — mesmos dados enviados por e-mail no dia 1 de
          cada mês (se houver e-mails configurados em Ajustes).
        </p>
      </div>

      <dl className="space-y-4 rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-6 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Total utilizado
          </dt>
          <dd className="text-lg text-kmp-text">{formatBytes(r.totalBytes)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Variação vs. 30 dias atrás
          </dt>
          <dd className="text-lg text-kmp-text">
            {formatDelta(r.deltaVsMesAnterior)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Média por cliente
          </dt>
          <dd className="text-lg text-kmp-text">
            {formatBytes(r.mediaPorClienteBytes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Maiores consumidores
          </dt>
          <dd className="mt-1 space-y-0.5 text-sm text-kmp-text/80">
            {r.topClientes.map((c) => (
              <p key={c.nome}>
                {c.nome} — {formatBytes(c.bytes)}
              </p>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Arquivos acima de 20 MB
          </dt>
          <dd className="text-lg text-kmp-text">{r.arquivosGrandes.length}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Duplicados
          </dt>
          <dd className="text-lg text-kmp-text">
            {r.duplicadosGrupos} grupos ({formatBytes(r.duplicadosBytes)} redundantes)
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Projeção de uso em 6 meses
          </dt>
          <dd className="text-lg text-kmp-text">
            {r.projecao6MesesBytes === null
              ? "sem histórico suficiente ainda (a rotina diária precisa rodar por mais tempo)"
              : formatBytes(r.projecao6MesesBytes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-kmp-text/50">
            Estimativa de custo extra (Supabase, acima de 100 GB)
          </dt>
          <dd className="text-lg text-kmp-text">
            {r.estimativaCustoExtraUsd === null
              ? "sem histórico suficiente ainda"
              : `US$ ${r.estimativaCustoExtraUsd.toFixed(2)}/mês`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
