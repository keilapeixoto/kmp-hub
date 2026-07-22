import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getStorageSettings } from "./validation";
import type {
  StorageAlertEvent,
  StorageAuditRun,
  StorageDailySnapshot,
} from "./types";

export { getStorageSettings };

type DocRow = {
  id: string;
  client_id: string;
  case_id: string | null;
  categoria_id: string | null;
  hash_sha256: string | null;
  tamanho_bytes: number | null;
  formato: string | null;
  arquivado: boolean;
  nome: string | null;
  storage_path: string;
  created_at: string;
};

/**
 * Painel de armazenamento é admin/director only (controle de armazenamento,
 * requisito 9) — usa o cliente admin de propósito, pra contar TUDO (inclusive
 * documentos arquivados, que continuam ocupando espaço real) independente
 * do RLS de documents, que esconde arquivados de quem não é admin.
 */
async function fetchAllDocuments(): Promise<DocRow[]> {
  const supabase = createAdminClient();
  const rows: DocRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, client_id, case_id, categoria_id, hash_sha256, tamanho_bytes, formato, arquivado, nome, storage_path, created_at",
      )
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as DocRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export type StorageDashboardData = {
  totalBytes: number;
  totalBytesAtivos: number;
  totalBytesArquivados: number;
  totalArquivos: number;
  semMetadados: number;
  limiteBytes: number;
  percentualUsado: number;
  orfaosSemProcesso: number;
  byClient: { clientId: string; nome: string; bytes: number; arquivos: number }[];
  byCase: { caseId: string; label: string; bytes: number; arquivos: number }[];
  byCategoria: { categoriaId: string | null; nome: string; bytes: number; arquivos: number }[];
  heaviestFiles: {
    documentId: string;
    nome: string;
    clienteNome: string;
    bytes: number;
    formato: string | null;
    createdAt: string;
  }[];
  duplicateGroups: {
    hash: string;
    bytes: number;
    documentos: { documentId: string; nome: string; clienteNome: string; createdAt: string }[];
  }[];
  growth: { dias: number; bytesAntes: number | null; deltaBytes: number | null }[];
};

export async function getStorageDashboardData(): Promise<StorageDashboardData> {
  const admin = createAdminClient();
  const [docs, settings] = await Promise.all([fetchAllDocuments(), getStorageSettings()]);

  const totalBytes = docs.reduce((s, d) => s + (d.tamanho_bytes ?? 0), 0);
  const totalBytesAtivos = docs
    .filter((d) => !d.arquivado)
    .reduce((s, d) => s + (d.tamanho_bytes ?? 0), 0);
  const totalBytesArquivados = totalBytes - totalBytesAtivos;
  const semMetadados = docs.filter((d) => d.tamanho_bytes == null).length;
  const orfaosSemProcesso = docs.filter((d) => d.case_id === null).length;

  const [{ data: clients }, { data: cases }, { data: categorias }] = await Promise.all([
    admin.from("clients").select("id, nome"),
    admin.from("cases").select("id, service_types!cases_service_type_id_fkey(nome)"),
    admin.from("document_categories").select("id, nome"),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.nome as string]));
  const caseLabel = new Map(
    (cases ?? []).map((c) => [
      c.id,
      (c.service_types as unknown as { nome: string } | null)?.nome ?? "Sem tipo de serviço",
    ]),
  );
  const categoriaName = new Map((categorias ?? []).map((c) => [c.id, c.nome as string]));

  const byClientMap = new Map<string, { bytes: number; arquivos: number }>();
  const byCaseMap = new Map<string, { bytes: number; arquivos: number }>();
  const byCategoriaMap = new Map<string | null, { bytes: number; arquivos: number }>();
  const byHash = new Map<string, DocRow[]>();

  for (const d of docs) {
    const bytes = d.tamanho_bytes ?? 0;

    const cEntry = byClientMap.get(d.client_id) ?? { bytes: 0, arquivos: 0 };
    cEntry.bytes += bytes;
    cEntry.arquivos += 1;
    byClientMap.set(d.client_id, cEntry);

    if (d.case_id) {
      const caEntry = byCaseMap.get(d.case_id) ?? { bytes: 0, arquivos: 0 };
      caEntry.bytes += bytes;
      caEntry.arquivos += 1;
      byCaseMap.set(d.case_id, caEntry);
    }

    const catEntry = byCategoriaMap.get(d.categoria_id) ?? { bytes: 0, arquivos: 0 };
    catEntry.bytes += bytes;
    catEntry.arquivos += 1;
    byCategoriaMap.set(d.categoria_id, catEntry);

    if (d.hash_sha256) {
      if (!byHash.has(d.hash_sha256)) byHash.set(d.hash_sha256, []);
      byHash.get(d.hash_sha256)!.push(d);
    }
  }

  const byClient = [...byClientMap.entries()]
    .map(([clientId, v]) => ({ clientId, nome: clientName.get(clientId) ?? "—", ...v }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15);

  const byCase = [...byCaseMap.entries()]
    .map(([caseId, v]) => ({ caseId, label: caseLabel.get(caseId) ?? "—", ...v }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15);

  const byCategoria = [...byCategoriaMap.entries()]
    .map(([categoriaId, v]) => ({
      categoriaId,
      nome: categoriaId ? categoriaName.get(categoriaId) ?? "—" : "Sem categoria",
      ...v,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const heaviestFiles = [...docs]
    .filter((d) => d.tamanho_bytes != null)
    .sort((a, b) => (b.tamanho_bytes ?? 0) - (a.tamanho_bytes ?? 0))
    .slice(0, 20)
    .map((d) => ({
      documentId: d.id,
      nome: d.nome ?? d.storage_path.split("/").pop() ?? d.storage_path,
      clienteNome: clientName.get(d.client_id) ?? "—",
      bytes: d.tamanho_bytes ?? 0,
      formato: d.formato,
      createdAt: d.created_at,
    }));

  const duplicateGroups = [...byHash.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([hash, group]) => ({
      hash,
      bytes: group[0].tamanho_bytes ?? 0,
      documentos: group.map((d) => ({
        documentId: d.id,
        nome: d.nome ?? d.storage_path.split("/").pop() ?? d.storage_path,
        clienteNome: clientName.get(d.client_id) ?? "—",
        createdAt: d.created_at,
      })),
    }))
    .sort((a, b) => b.bytes * b.documentos.length - a.bytes * a.documentos.length)
    .slice(0, 30);

  const growth = await getGrowth(totalBytes);

  return {
    totalBytes,
    totalBytesAtivos,
    totalBytesArquivados,
    totalArquivos: docs.length,
    semMetadados,
    limiteBytes: settings.internal_limit_bytes,
    percentualUsado:
      settings.internal_limit_bytes > 0
        ? (totalBytes / settings.internal_limit_bytes) * 100
        : 0,
    orfaosSemProcesso,
    byClient,
    byCase,
    byCategoria,
    heaviestFiles,
    duplicateGroups,
    growth,
  };
}

async function getGrowth(
  totalBytesHoje: number,
): Promise<StorageDashboardData["growth"]> {
  const admin = createAdminClient();
  const { data: snapshots } = await admin
    .from("storage_daily_snapshots")
    .select("snapshot_date, total_bytes")
    .order("snapshot_date", { ascending: false });

  const byDate = new Map((snapshots ?? []).map((s) => [s.snapshot_date, s.total_bytes]));
  const janelas = [30, 90, 365];

  return janelas.map((dias) => {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() - dias);
    const alvoStr = alvo.toISOString().slice(0, 10);

    // pega o snapshot mais próximo (igual ou anterior) à data alvo
    let bytesAntes: number | null = null;
    for (const [date, bytes] of [...byDate.entries()].sort()) {
      if (date <= alvoStr) bytesAntes = bytes;
      else break;
    }

    return {
      dias,
      bytesAntes,
      deltaBytes: bytesAntes === null ? null : totalBytesHoje - bytesAntes,
    };
  });
}

export async function getRecentAlerts(limit = 10): Promise<StorageAlertEvent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("storage_alert_events")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as StorageAlertEvent[];
}

export async function getRecentAuditRuns(limit = 10): Promise<StorageAuditRun[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("storage_audit_runs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as StorageAuditRun[];
}

export async function getDailySnapshots(limit = 90): Promise<StorageDailySnapshot[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("storage_daily_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as StorageDailySnapshot[];
}

/**
 * Usa o cliente da sessão (não o admin) de propósito — o RLS de
 * storage_alert_events já restringe update a admin/director, então isso
 * garante que só quem realmente tem a função certa consegue reconhecer um
 * alerta, mesmo que essa action seja chamada fora da tela do painel.
 */
export async function acknowledgeAlert(alertId: string, userId: string) {
  const supabase = await createSupabaseClient();
  await supabase
    .from("storage_alert_events")
    .update({ reconhecido_em: new Date().toISOString(), reconhecido_por: userId })
    .eq("id", alertId);
}
