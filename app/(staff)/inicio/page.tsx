import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  Globe,
  Mail,
  Receipt,
  TrendingUp,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ACCENT_STYLES, type Accent } from "@/lib/ui/accent";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getCurrentUserRole,
} from "@/lib/auth";
import { formatTimesInAllZones } from "@/lib/appointments/timezones";
import { getDashboardMetrics } from "@/lib/dashboard/data";
import { getQueueCounts } from "@/lib/cases/data";
import { getRecentImmigrationNews } from "@/lib/immigration-news/data";
import { getGoogleDaySummary } from "@/lib/google/dashboard";
import { deleteImmigrationNews } from "./actions";
import { NewsAddForm } from "./_components/news-add-form";
import { GoogleDaySummaryCard } from "./_components/google-day-summary";
import { FormsOverviewCard } from "./_components/forms-overview-card";
import { getFormsOverview } from "@/lib/case-forms/overview-server";

// Atalhos do Início como blocos coloridos inteiros (redesign âmbar, out/2026,
// pedido da Keila): degradê da cor do módulo, ícone grande, nome em branco.
const ATALHOS: {
  href: string;
  label: string;
  icon: LucideIcon;
  cor: string;
  externo?: boolean;
}[] = [
  { href: "/leads", label: "Leads", icon: Users, cor: "from-[#45b4c5] to-kmp-leads-deep" },
  { href: "/clientes", label: "Clientes", icon: UserCircle, cor: "from-[#9184f2] to-kmp-clientes-deep" },
  { href: "/processos", label: "Processos", icon: Briefcase, cor: "from-[#45c285] to-kmp-processos-deep" },
  { href: "/agenda", label: "Agenda", icon: Calendar, cor: "from-[#f0c040] to-kmp-agenda-deep" },
  { href: "/financeiro", label: "Financeiro", icon: Receipt, cor: "from-[#e8679a] to-kmp-finance-deep" },
  { href: "/guias", label: "Guias", icon: BookOpen, cor: "from-[#bd72ae] to-kmp-documentos-deep" },
  { href: "https://online.immi.gov.au/lusc/login", label: "ImmiAccount", icon: Globe, cor: "from-[#5f92f2] to-kmp-config-deep", externo: true },
  // Gmail no navegador: mailto: não abre nada sem app de e-mail instalado.
  { href: "https://mail.google.com/", label: "E-mail", icon: Mail, cor: "from-kmp-orange to-kmp-orange-deep", externo: true },
];

function StatTile({
  label,
  value,
  href,
  icon: Icon,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  href: string;
  icon: LucideIcon;
  accent: Accent;
  warn?: boolean;
}) {
  const styles = ACCENT_STYLES[warn ? "alert" : accent];
  return (
    <Link
      href={href}
      className="rounded-2xl bg-kmp-surface p-4 shadow-sm transition dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20 dark:hover:border-kmp-config/70"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/60">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.tile}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-3 font-heading text-2xl font-extrabold text-kmp-text">
        {value}
      </p>
    </Link>
  );
}

export default async function InicioPage() {
  const userId = await getCurrentUserId();
  const [profile, role, metrics, queue, news, formsOverview, googleSummary] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentUserRole(),
    getDashboardMetrics(),
    getQueueCounts(),
    getRecentImmigrationNews(),
    getFormsOverview(),
    userId
      ? getGoogleDaySummary(userId)
      : Promise.resolve({
          connected: false as const,
          eventos: [],
          totalNaoLidos: 0,
          mensagensUrgentes: [],
          erro: null,
        }),
  ]);

  const canManageNews = role === "admin" || role === "director";
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-kmp-text/40">
            {dataHoje}
          </p>
          <h1 className="mt-1 font-heading text-3xl text-kmp-text">
            Bem-vindo(a){profile?.nome ? `, ${profile.nome}` : ""}
          </h1>
          <p className="mt-1 text-sm text-kmp-text/60">
            Aqui está o panorama do escritório hoje.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Ir para o Dashboard completo →
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-kmp-text/70">Ir direto para</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {ATALHOS.map((a) => {
            const Icon = a.icon;
            const conteudo = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{a.label}</span>
                <Icon aria-hidden="true" className="absolute -bottom-3 -right-3 h-20 w-20 opacity-15" />
              </>
            );
            const classe = `relative flex h-28 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${a.cor} p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`;
            return a.externo ? (
              <a key={a.href} href={a.href} target="_blank" rel="noreferrer" className={classe}>
                {conteudo}
              </a>
            ) : (
              <Link key={a.href} href={a.href} className={classe}>
                {conteudo}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Tarefas vencidas"
          value={metrics.tarefasVencidas}
          warn={metrics.tarefasVencidas > 0}
          href="/tarefas"
          icon={CheckSquare}
          accent="agenda"
        />
        <StatTile
          label="Processos parados"
          value={metrics.processosParados}
          warn={metrics.processosParados > 0}
          href="/processos"
          icon={AlertTriangle}
          accent="processos"
        />
        <StatTile
          label="Novos leads (30d)"
          value={metrics.novosLeads30d}
          href="/leads"
          icon={TrendingUp}
          accent="leads"
        />
        <StatTile
          label="Hoje na agenda"
          value={metrics.atendimentosHoje.length}
          href="/agenda"
          icon={CheckSquare}
          accent="agenda"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-kmp-surface p-5 shadow-sm dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20 lg:col-span-2">
          <h2 className="font-heading text-lg text-kmp-text">Visões rápidas</h2>
          <p className="mt-1 text-xs text-kmp-text/50">
            Atalhos pros processos que precisam de atenção agora.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/processos?view=fila&fila=todos"
              className="rounded-xl bg-kmp-divider p-3 text-center transition hover:opacity-80"
            >
              <p className="font-heading text-xl font-extrabold text-kmp-text">
                {queue.ativos}
              </p>
              <p className="mt-1 text-xs text-kmp-text/50">Todos ativos</p>
            </Link>
            <Link
              href="/processos?view=fila&fila=alta"
              className="rounded-xl bg-kmp-divider p-3 text-center transition hover:opacity-80"
            >
              <p className="font-heading text-xl font-extrabold text-red-500">
                {queue.prioridadeAlta}
              </p>
              <p className="mt-1 text-xs text-kmp-text/50">Prioridade alta</p>
            </Link>
            <Link
              href="/processos?view=fila&fila=atrasados"
              className="rounded-xl bg-kmp-divider p-3 text-center transition hover:opacity-80"
            >
              <p className="font-heading text-xl font-extrabold text-orange-500">
                {queue.atrasados}
              </p>
              <p className="mt-1 text-xs text-kmp-text/50">Atrasados</p>
            </Link>
            <Link
              href="/processos?view=fila&fila=pausados"
              className="rounded-xl bg-kmp-divider p-3 text-center transition hover:opacity-80"
            >
              <p className="font-heading text-xl font-extrabold text-kmp-text">
                {queue.pausados}
              </p>
              <p className="mt-1 text-xs text-kmp-text/50">Pausados</p>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-kmp-surface p-5 shadow-sm dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20">
          <h2 className="font-heading text-lg text-kmp-text">Hoje</h2>
          {metrics.atendimentosHoje.length === 0 ? (
            <p className="mt-3 text-sm text-kmp-text/50">
              Nenhum compromisso hoje.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {metrics.atendimentosHoje.map((ap) => (
                <li key={ap.id} className="text-sm">
                  <Link
                    href={`/agenda/${ap.id}`}
                    className="text-kmp-text hover:text-kmp-orange"
                  >
                    <p className="font-medium">{ap.titulo}</p>
                    <p className="text-xs text-kmp-text/40">
                      {formatTimesInAllZones(ap.inicio)}
                      {ap.tipo ? ` · ${ap.tipo}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <GoogleDaySummaryCard summary={googleSummary} />
      <FormsOverviewCard {...formsOverview} />

      <div className="rounded-2xl bg-kmp-surface p-5 shadow-sm dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20">
        <h2 className="font-heading text-lg text-kmp-text">
          Novidades de imigração
        </h2>
        <p className="mt-1 text-xs text-kmp-text/50">
          Publicado manualmente pela equipe — ainda não é automático.
        </p>

        {news.length === 0 ? (
          <p className="mt-4 text-sm text-kmp-text/50">
            Nenhuma novidade publicada ainda.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-kmp-divider">
            {news.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  {n.link ? (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-kmp-text hover:text-kmp-orange"
                    >
                      {n.titulo}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-kmp-text">{n.titulo}</p>
                  )}
                  <p className="mt-0.5 text-xs text-kmp-text/40">
                    {new Date(n.publicado_em).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                    {n.fonte ? ` · ${n.fonte}` : ""}
                  </p>
                </div>
                {canManageNews ? (
                  <form action={deleteImmigrationNews.bind(null, n.id)}>
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-kmp-text/50 transition hover:text-red-400"
                    >
                      Remover
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManageNews ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Publicar novidade
          </h2>
          <NewsAddForm />
        </div>
      ) : null}
    </div>
  );
}
