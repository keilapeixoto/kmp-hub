"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileText,
  Globe,
  HardDrive,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Upload,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/processos?view=kanban", label: "Pipeline", icon: Kanban },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/clientes", label: "Clientes", icon: UserCircle },
      { href: "/processos", label: "Processos", icon: Briefcase },
      { href: "/vencimentos", label: "Vencimentos", icon: CalendarClock },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { href: "/agenda", label: "Agenda", icon: Calendar },
    ],
  },
  {
    label: "Biblioteca",
    items: [
      { href: "/guias", label: "Guias", icon: BookOpen },
      { href: "/templates", label: "Templates", icon: MessageSquare },
      { href: "/ocupacoes", label: "Ocupações", icon: Globe },
    ],
  },
  {
    label: "Configurações",
    items: [
      {
        href: "/configuracoes",
        label: "Configurações",
        icon: Settings,
        exact: true,
      },
      {
        href: "/configuracoes/servicos",
        label: "Tipos de serviço",
        icon: Briefcase,
      },
      {
        href: "/configuracoes/checklists",
        label: "Checklists",
        icon: ClipboardList,
      },
      {
        href: "/configuracoes/formularios",
        label: "Formulários",
        icon: FileText,
      },
      {
        href: "/configuracoes/processos",
        label: "Status de processos",
        icon: Kanban,
      },
      {
        href: "/configuracoes/armazenamento",
        label: "Armazenamento",
        icon: HardDrive,
      },
      {
        href: "/configuracoes/equipe",
        label: "Equipe",
        icon: UsersRound,
      },
      {
        href: "/configuracoes/ocupacoes",
        label: "Importar ocupações",
        icon: Upload,
      },
    ],
  },
];

function isActive(
  pathname: string,
  currentView: string | null,
  href: string,
  exact?: boolean,
) {
  const [hrefPath, hrefQuery] = href.split("?");
  const pathMatches = exact
    ? pathname === hrefPath
    : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  if (!pathMatches) return false;
  const hrefView = new URLSearchParams(hrefQuery ?? "").get("view");
  return hrefView === currentView;
}

export function Sidebar() {
  const pathname = usePathname();
  const currentView = useSearchParams().get("view");

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-black/5 bg-white">
      <div className="px-6 py-5">
        <span className="font-heading text-lg font-extrabold text-kmp-graphite">
          KMP Hub
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`}>
            {group.label ? (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-kmp-graphite/40">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(
                  pathname,
                  currentView,
                  item.href,
                  item.exact,
                );
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-kmp-orange/10 text-kmp-orange-deep"
                        : "text-kmp-graphite/70 hover:bg-black/5 hover:text-kmp-graphite"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-gradient-to-br from-kmp-orange to-kmp-orange-deep text-white shadow-sm shadow-kmp-orange/40"
                          : "border border-black/10 bg-white text-kmp-graphite/40"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-black/5 px-6 py-4 text-xs text-kmp-graphite/40">
        KMP Hub · v1.0
      </div>
    </aside>
  );
}
