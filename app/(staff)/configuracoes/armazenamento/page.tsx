import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import {
  getRecentAlerts,
  getRecentAuditRuns,
  getStorageDashboardData,
} from "@/lib/storage-admin/data";
import { formatBytes, thresholdColor } from "@/lib/storage-admin/format";
import { AcknowledgeAlertButton } from "./_components/acknowledge-alert-button";

function formatDelta(bytes: number | null): string {
  if (bytes === null) return "sem dado histórico ainda";
  const sign = bytes > 0 ? "+" : "";
  return `${sign}${formatBytes(bytes)}`;
}

export default async function StorageAdminPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  const [data, alerts, auditRuns] = await Promise.all([
    getStorageDashboardData(),
    getRecentAlerts(5),
    getRecentAuditRuns(5),
  ]);

  const pct = Math.min(data.percentualUsado, 999);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-kmp-graphite">
            Armazenamento
          </h1>
          <p className="text-sm text-kmp-graphite/60">
            Controle de espaço ocupado por documentos — visão só de
            administradores.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/configuracoes/armazenamento/relatorio"
            className="text-kmp-graphite/70 hover:text-kmp-orange"
          >
            Relatório mensal
          </Link>
          <Link
            href="/configuracoes/armazenamento/ajustes"
            className="text-kmp-graphite/70 hover:text-kmp-orange"
          >
            Ajustes
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep p-6 shadow-md shadow-kmp-config/20">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-white/50">Total utilizado</p>
            <p className="font-heading text-3xl text-white">
              {formatBytes(data.totalBytes)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/50">
              de {formatBytes(data.limiteBytes)} ({pct.toFixed(1)}%)
            </p>
            <p className="text-xs text-white/40">
              {formatBytes(data.totalBytesAtivos)} ativos ·{" "}
              {formatBytes(data.totalBytesArquivados)} arquivados
            </p>
          </div>
        </div>
        <div className="mt-3 h-3 rounded-full bg-white/10">
          <div
            className={`h-3 rounded-full transition-all ${thresholdColor(pct)}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        {data.semMetadados > 0 ? (
          <p className="mt-2 text-xs text-white/40">
            {data.semMetadados} documento{data.semMetadados === 1 ? "" : "s"}{" "}
            ainda sem tamanho registrado (enviados antes do controle de
            armazenamento) — rode o backfill pra completar o histórico.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.growth.map((g) => (
          <div key={g.dias} className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep p-4 shadow-md shadow-kmp-config/20">
            <p className="text-xs uppercase tracking-wide text-white/50">
              Crescimento em {g.dias} dias
            </p>
            <p className="mt-1 text-lg font-medium text-white">
              {formatDelta(g.deltaBytes)}
            </p>
          </div>
        ))}
      </div>

      {alerts.length > 0 ? (
        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Alertas recentes
          </h2>
          <ul className="divide-y divide-white/10">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium text-white">
                    {a.threshold_pct}%
                  </span>{" "}
                  <span className="text-white/50">
                    atingido em{" "}
                    {new Date(a.triggered_at).toLocaleDateString("pt-BR")} ·{" "}
                    {formatBytes(a.total_bytes)} · e-mail:{" "}
                    {a.email_status}
                  </span>
                </span>
                {a.reconhecido_em ? (
                  <span className="text-xs text-white/40">
                    reconhecido
                  </span>
                ) : (
                  <AcknowledgeAlertButton alertId={a.id} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Por cliente
          </h2>
          <ul className="divide-y divide-white/10">
            {data.byClient.map((c) => (
              <li
                key={c.clientId}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <Link
                  href={`/clientes/${c.clientId}`}
                  className="text-white hover:text-kmp-orange"
                >
                  {c.nome}
                </Link>
                <span className="text-white/50">
                  {formatBytes(c.bytes)} · {c.arquivos}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Por processo
          </h2>
          <ul className="divide-y divide-white/10">
            {data.byCase.map((c) => (
              <li
                key={c.caseId}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <Link
                  href={`/processos/${c.caseId}`}
                  className="text-white hover:text-kmp-orange"
                >
                  {c.label}
                </Link>
                <span className="text-white/50">
                  {formatBytes(c.bytes)} · {c.arquivos}
                </span>
              </li>
            ))}
          </ul>
          {data.orfaosSemProcesso > 0 ? (
            <p className="border-t border-white/10 px-4 py-2 text-xs text-white/40">
              {data.orfaosSemProcesso} documentos ainda sem processo vinculado
              (normal para clientes importados antes de você criar o
              processo).
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Por categoria
          </h2>
          <ul className="divide-y divide-white/10">
            {data.byCategoria.map((c) => (
              <li
                key={c.categoriaId ?? "sem-categoria"}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="text-white">{c.nome}</span>
                <span className="text-white/50">
                  {formatBytes(c.bytes)} · {c.arquivos}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Maiores arquivos
          </h2>
          <ul className="divide-y divide-white/10">
            {data.heaviestFiles.slice(0, 10).map((f) => (
              <li
                key={f.documentId}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="truncate text-white" title={f.nome}>
                  {f.nome} <span className="text-white/40">· {f.clienteNome}</span>
                </span>
                <span className="shrink-0 text-white/50">
                  {formatBytes(f.bytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
        <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
          Possíveis duplicados
        </h2>
        {data.duplicateGroups.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/50">
            Nenhum arquivo duplicado detectado até agora.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.duplicateGroups.map((g) => (
              <li key={g.hash} className="px-4 py-3 text-sm">
                <p className="text-white/50">
                  {g.documentos.length} cópias · {formatBytes(g.bytes)} cada
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-white/40">
                  {g.documentos.map((d) => (
                    <li key={d.documentId}>
                      {d.nome} — {d.clienteNome}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {auditRuns.length > 0 ? (
        <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
          <h2 className="border-b border-white/10 px-4 py-3 font-heading text-lg text-white">
            Últimas verificações automáticas
          </h2>
          <ul className="divide-y divide-white/10">
            {auditRuns.map((r) => (
              <li key={r.id} className="px-4 py-2 text-xs text-white/50">
                {new Date(r.run_at).toLocaleString("pt-BR")} —{" "}
                {formatBytes(r.total_bytes)} · {r.orfaos_sem_processo} sem
                processo · {r.duplicados_grupos} grupos duplicados ·{" "}
                {r.status === "ok" ? "ok" : `erro: ${r.detalhe ?? ""}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
