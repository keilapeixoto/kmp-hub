import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckSquare,
  FileWarning,
  Percent,
  TrendingUp,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { ACCENT_STYLES, type Accent } from "@/lib/ui/accent";
import { getCurrentUserProfile } from "@/lib/auth";
import { formatTimesInAllZones } from "@/lib/appointments/timezones";
import { getTeamMembersStaff } from "@/lib/cases/data";
import { getDashboardMetrics, STALLED_CASE_DAYS } from "@/lib/dashboard/data";
import { getWorkload } from "@/lib/tasks/data";
import { createClient } from "@/lib/supabase/server";

function StatCard({
  label,
  value,
  warn,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
  href: string;
  icon: LucideIcon;
  accent: Accent;
}) {
  const styles = ACCENT_STYLES[warn ? "alert" : accent];
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kmp-graphite/50">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.tile}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-3 font-heading text-2xl font-extrabold text-kmp-graphite">
        {value}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, metrics, workload, staff] = await Promise.all([
    getCurrentUserProfile(),
    getDashboardMetrics(),
    getWorkload(),
    getTeamMembersStaff(),
  ]);

  const staffName = (id: string) =>
    staff.find((m) => m.user_id === id)?.nome ?? "—";
  const maxLoad = Math.max(1, ...Array.from(workload.values()));
  const maxEtapa = Math.max(1, ...metrics.processosPorEtapa.map((e) => e.total));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-kmp-graphite">
        Bem-vindo(a){profile?.nome ? `, ${profile.nome}` : ""}
      </h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Novos leads (30d)"
          value={metrics.novosLeads30d}
          href="/leads"
          icon={TrendingUp}
          accent="leads"
        />
        <StatCard
          label="Conversão"
          value={metrics.conversaoPct === null ? "—" : `${metrics.conversaoPct}%`}
          href="/leads"
          icon={Percent}
          accent="leads"
        />
        <StatCard
          label="Clientes ativos"
          value={metrics.clientesAtivos}
          href="/clientes"
          icon={UserCircle}
          accent="clientes"
        />
        <StatCard
          label={`Processos parados (${STALLED_CASE_DAYS}d)`}
          value={metrics.processosParados}
          warn={metrics.processosParados > 0}
          href="/processos"
          icon={AlertTriangle}
          accent="processos"
        />
        <StatCard
          label="Tarefas vencidas"
          value={metrics.tarefasVencidas}
          warn={metrics.tarefasVencidas > 0}
          href="/tarefas"
          icon={CheckSquare}
          accent="agenda"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            Processos ativos por etapa ({metrics.processosAtivos})
          </h2>
          {metrics.processosPorEtapa.length === 0 ? (
            <p className="text-sm text-kmp-graphite/60">
              Nenhum processo ativo com etapa definida.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.processosPorEtapa.map((e) => (
                <div key={e.etapa} className="flex items-center gap-3 text-sm">
                  <span className="w-44 truncate text-kmp-graphite">{e.etapa}</span>
                  <div className="h-2 flex-1 rounded-full bg-black/5">
                    <div
                      className="h-2 rounded-full bg-kmp-orange"
                      style={{ width: `${(e.total / maxEtapa) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-kmp-graphite/60">
                    {e.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            Atendimentos de hoje
          </h2>
          {metrics.atendimentosHoje.length === 0 ? (
            <p className="text-sm text-kmp-graphite/60">
              Nenhum compromisso hoje.
            </p>
          ) : (
            <ul className="space-y-2">
              {metrics.atendimentosHoje.map((ap) => (
                <li key={ap.id} className="text-sm">
                  <Link
                    href={`/agenda/${ap.id}`}
                    className="text-kmp-graphite hover:text-kmp-orange"
                  >
                    <span className="font-medium">{ap.titulo}</span>
                    {ap.tipo ? (
                      <span className="text-kmp-graphite/50"> · {ap.tipo}</span>
                    ) : null}
                    <span className="block text-xs text-kmp-graphite/50">
                      {formatTimesInAllZones(ap.inicio)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            Carga da equipe (tarefas abertas)
          </h2>
          {workload.size === 0 ? (
            <p className="text-sm text-kmp-graphite/60">
              Nenhuma tarefa aberta.
            </p>
          ) : (
            <div className="space-y-2">
              {Array.from(workload.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([userId, count]) => (
                  <div key={userId} className="flex items-center gap-3 text-sm">
                    <span className="w-44 truncate text-kmp-graphite">
                      {staffName(userId)}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-black/5">
                      <div
                        className="h-2 rounded-full bg-kmp-orange"
                        style={{ width: `${(count / maxLoad) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-kmp-graphite/60">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                ACCENT_STYLES[
                  metrics.documentosPendentes > 0 ? "alert" : "documentos"
                ].tile
              }`}
            >
              <FileWarning className="h-3.5 w-3.5" />
            </span>
            Documentos pendentes
          </div>
          <p className="font-heading text-2xl font-extrabold text-kmp-graphite">
            {metrics.documentosPendentes}
          </p>
          <p className="mt-1 text-xs text-kmp-graphite/50">
            Itens de checklist aguardando envio, análise ou correção.
          </p>
        </div>
      </div>
    </div>
  );
}
