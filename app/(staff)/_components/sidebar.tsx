"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileText,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
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
    ],
  },
  {
    label: "Configurações",
    items: [
      {
        href: "/configuracoes/servicos",
        label: "Configurações",
        icon: Settings,
      },
    ],
  },
];

function isActive(pathname: string, currentView: string | null, href: string) {
  const [hrefPath, hrefQuery] = href.split("?");
  const pathMatches = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  if (!pathMatches) return false;
  const hrefView = new URLSearchParams(hrefQuery ?? "").get("view");
  return hrefView === currentView;
}

export function Sidebar() {
  const pathname = usePathname();
  const currentView = useSearchParams().get("view");

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-kmp-graphite text-white">
      <div className="border-b border-white/10 px-6 py-5">
        <span className="font-heading text-xl">KMP Hub</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`}>
            {group.label ? (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-white/40">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, currentView, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-kmp-orange text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-white/40">
        KMP Hub · v1.0
      </div>
    </aside>
  );
}
