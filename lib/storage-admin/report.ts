import { createAdminClient } from "@/lib/supabase/admin";
import { getDailySnapshots, getStorageDashboardData } from "./data";
import { formatBytes } from "./format";

// Plano Pro do Supabase: 100 GB de Storage incluídos, US$0,0213/GB excedente
// (ver revisão do controle de armazenamento). Só usado pra estimar custo —
// não é o limite interno (esse é configurável em storage_settings).
const SUPABASE_INCLUDED_BYTES = 100 * 1024 * 1024 * 1024;
const SUPABASE_OVERAGE_USD_PER_GB = 0.0213;

export type MonthlyReport = {
  totalBytes: number;
  deltaVsMesAnterior: number | null;
  mediaPorClienteBytes: number;
  topClientes: { nome: string; bytes: number }[];
  arquivosGrandes: { nome: string; clienteNome: string; bytes: number }[];
  duplicadosGrupos: number;
  duplicadosBytes: number;
  projecao6MesesBytes: number | null;
  estimativaCustoExtraUsd: number | null;
};

export async function getMonthlyReport(): Promise<MonthlyReport> {
  const admin = createAdminClient();
  const [data, snapshots, { count: totalClientes }] = await Promise.all([
    getStorageDashboardData(),
    getDailySnapshots(120),
    admin.from("clients").select("*", { count: "exact", head: true }),
  ]);

  const deltaVsMesAnterior =
    data.growth.find((g) => g.dias === 30)?.deltaBytes ?? null;

  const mediaPorClienteBytes =
    totalClientes && totalClientes > 0 ? data.totalBytes / totalClientes : 0;

  const arquivosGrandes = data.heaviestFiles
    .filter((f) => f.bytes > 20 * 1024 * 1024)
    .map((f) => ({ nome: f.nome, clienteNome: f.clienteNome, bytes: f.bytes }));

  const duplicadosBytes = data.duplicateGroups.reduce(
    (sum, g) => sum + g.bytes * (g.documentos.length - 1),
    0,
  );

  // Projeção: taxa de crescimento diário a partir dos últimos ~90 dias de
  // snapshot (ou 30 dias se ainda não houver histórico longo).
  const ordenados = [...snapshots].sort((a, b) =>
    a.snapshot_date.localeCompare(b.snapshot_date),
  );
  let projecao6MesesBytes: number | null = null;
  if (ordenados.length >= 2) {
    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    const dias = Math.max(
      1,
      (new Date(ultimo.snapshot_date).getTime() -
        new Date(primeiro.snapshot_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const taxaDiaria = (ultimo.total_bytes - primeiro.total_bytes) / dias;
    projecao6MesesBytes = Math.max(0, data.totalBytes + taxaDiaria * 180);
  }

  const estimativaCustoExtraUsd =
    projecao6MesesBytes !== null && projecao6MesesBytes > SUPABASE_INCLUDED_BYTES
      ? ((projecao6MesesBytes - SUPABASE_INCLUDED_BYTES) / (1024 * 1024 * 1024)) *
        SUPABASE_OVERAGE_USD_PER_GB
      : projecao6MesesBytes !== null
        ? 0
        : null;

  return {
    totalBytes: data.totalBytes,
    deltaVsMesAnterior,
    mediaPorClienteBytes,
    topClientes: data.byClient.slice(0, 5).map((c) => ({ nome: c.nome, bytes: c.bytes })),
    arquivosGrandes,
    duplicadosGrupos: data.duplicateGroups.length,
    duplicadosBytes,
    projecao6MesesBytes,
    estimativaCustoExtraUsd,
  };
}

export async function getMonthlyReportHtml(): Promise<string> {
  const r = await getMonthlyReport();
  const linhas = [
    `<h2>Relatório mensal de armazenamento — KMP Hub</h2>`,
    `<p>Total utilizado: <strong>${formatBytes(r.totalBytes)}</strong></p>`,
    `<p>Variação vs. 30 dias atrás: ${
      r.deltaVsMesAnterior === null
        ? "sem dado histórico ainda"
        : `${r.deltaVsMesAnterior > 0 ? "+" : ""}${formatBytes(r.deltaVsMesAnterior)}`
    }</p>`,
    `<p>Média por cliente: ${formatBytes(r.mediaPorClienteBytes)}</p>`,
    `<p><strong>Maiores consumidores:</strong><br/>${r.topClientes
      .map((c) => `${c.nome}: ${formatBytes(c.bytes)}`)
      .join("<br/>")}</p>`,
    `<p>Arquivos acima de 20 MB: ${r.arquivosGrandes.length}</p>`,
    `<p>Grupos de arquivos duplicados: ${r.duplicadosGrupos} (${formatBytes(r.duplicadosBytes)} redundantes)</p>`,
    `<p>Projeção de uso em 6 meses: ${
      r.projecao6MesesBytes === null ? "sem histórico suficiente ainda" : formatBytes(r.projecao6MesesBytes)
    }</p>`,
    `<p>Estimativa de custo extra (Supabase, se ultrapassar 100 GB inclusos): ${
      r.estimativaCustoExtraUsd === null
        ? "sem histórico suficiente ainda"
        : `US$ ${r.estimativaCustoExtraUsd.toFixed(2)}/mês`
    }</p>`,
  ];
  return linhas.join("\n");
}
