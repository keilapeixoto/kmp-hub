import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStorageDashboardData,
  getStorageSettings,
} from "@/lib/storage-admin/data";
import { sendEmail } from "@/lib/storage-admin/email";
import { formatBytes } from "@/lib/storage-admin/format";
import { getMonthlyReportHtml } from "@/lib/storage-admin/report";

/**
 * Rotina diária de armazenamento (controle de armazenamento, requisito 5).
 * Agendada via Vercel Cron (vercel.json) — protegida pelo header que a
 * Vercel injeta automaticamente com CRON_SECRET quando o job dispara. Nunca
 * loga conteúdo de documento, só contagens/totais (requisito 9).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createAdminClient();

  try {
    const [data, settings] = await Promise.all([
      getStorageDashboardData(),
      getStorageSettings(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const porCategoria = Object.fromEntries(
      data.byCategoria.map((c) => [c.nome, c.bytes]),
    );

    await admin.from("storage_daily_snapshots").upsert(
      {
        snapshot_date: today,
        total_bytes: data.totalBytes,
        total_bytes_ativos: data.totalBytesAtivos,
        total_bytes_arquivados: data.totalBytesArquivados,
        total_arquivos: data.totalArquivos,
        por_categoria: porCategoria,
      },
      { onConflict: "snapshot_date" },
    );

    const duplicadosBytes = data.duplicateGroups.reduce(
      (sum, g) => sum + g.bytes * (g.documentos.length - 1),
      0,
    );

    const thresholdsCruzados = await checkThresholds(
      data.percentualUsado,
      settings.alert_thresholds_pct,
      settings.alert_emails,
      data.totalBytes,
      settings.internal_limit_bytes,
    );

    await admin.from("storage_audit_runs").insert({
      total_bytes: data.totalBytes,
      orfaos_sem_processo: data.orfaosSemProcesso,
      duplicados_grupos: data.duplicateGroups.length,
      duplicados_bytes: duplicadosBytes,
      thresholds_cruzados: thresholdsCruzados,
      status: "ok",
      duracao_ms: Date.now() - startedAt,
    });

    // Relatório mensal — só no dia 1, enviado junto com o e-mail de alerta se
    // houver, ou sozinho.
    const isFirstOfMonth = new Date().getUTCDate() === 1;
    if (isFirstOfMonth && settings.alert_emails.length > 0) {
      const html = await getMonthlyReportHtml();
      await sendEmail(
        settings.alert_emails,
        "KMP Hub — Relatório mensal de armazenamento",
        html,
      );
    }

    return NextResponse.json({
      ok: true,
      totalBytes: data.totalBytes,
      thresholdsCruzados,
    });
  } catch (err) {
    await admin.from("storage_audit_runs").insert({
      total_bytes: 0,
      status: "erro",
      detalhe: err instanceof Error ? err.message : "erro desconhecido",
      duracao_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function checkThresholds(
  percentualUsado: number,
  thresholds: number[],
  alertEmails: string[],
  totalBytes: number,
  limiteBytes: number,
): Promise<number[]> {
  const admin = createAdminClient();
  const cruzados: number[] = [];

  for (const threshold of thresholds) {
    if (percentualUsado < threshold) continue;

    const { data: lastAlert } = await admin
      .from("storage_alert_events")
      .select("id, triggered_at")
      .eq("threshold_pct", threshold)
      .order("triggered_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAlert) {
      // Já alertado antes — só alerta de novo se caiu abaixo do threshold
      // em algum snapshot desde o último alerta (evita spam diário).
      const { data: snapshotsSince } = await admin
        .from("storage_daily_snapshots")
        .select("total_bytes")
        .gt("snapshot_date", lastAlert.triggered_at.slice(0, 10));

      const caiuAbaixo = (snapshotsSince ?? []).some(
        (s) => (s.total_bytes / limiteBytes) * 100 < threshold,
      );
      if (!caiuAbaixo) continue;
    }

    cruzados.push(threshold);

    let emailStatus: "enviado" | "falhou" | "sem_destinatario" = "sem_destinatario";
    let detalhe: string | null = null;
    if (alertEmails.length > 0) {
      const result = await sendEmail(
        alertEmails,
        `KMP Hub — armazenamento atingiu ${threshold}%`,
        `<p>O armazenamento de documentos atingiu <strong>${threshold}%</strong> do limite interno configurado.</p>` +
          `<p>Total utilizado: ${formatBytes(totalBytes)}.</p>` +
          `<p>Veja o painel completo em /configuracoes/armazenamento.</p>`,
      );
      emailStatus = result.ok ? "enviado" : "falhou";
      detalhe = result.error;
    }

    await admin.from("storage_alert_events").insert({
      threshold_pct: threshold,
      total_bytes: totalBytes,
      emails_sent_to: alertEmails,
      email_status: emailStatus,
      detalhe,
    });
  }

  return cruzados;
}
