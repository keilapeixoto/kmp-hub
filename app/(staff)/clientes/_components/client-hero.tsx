import Link from "next/link";
import {
  CalendarClock,
  FileText,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  Pencil,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DEGRADE } from "@/components/ui/vivid";
import type { Client } from "@/lib/clients/types";
import { iniciais, prazoRelativo } from "@/lib/clients/perfil-calc";
import { FotoDoCliente } from "./foto-do-cliente";

// Cabeçalho do perfil do cliente (out/2026, referência visual da Keila):
// faixa na cor de Clientes com avatar, nome, visto e consultora; à direita,
// anéis com o andamento dos processos em aberto; embaixo, as abas em pílula.

export const ABAS_DO_CLIENTE: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: "resumo", label: "Resumo", icon: LayoutDashboard },
  { slug: "processos", label: "Processos", icon: GitBranch },
  { slug: "documentos", label: "Documentos", icon: FolderOpen },
  { slug: "dados", label: "Dados", icon: FileText },
  { slug: "dependentes", label: "Dependentes", icon: Users },
  { slug: "linha-do-tempo", label: "Linha do tempo", icon: History },
];

/** Indicador clicável: leva ao lugar do processo onde se resolve aquilo. */
function Atalho({ href, children, titulo }: { href: string | null; children: React.ReactNode; titulo: string }) {
  if (!href) return <>{children}</>;
  return (
    <Link
      href={href}
      title={titulo}
      className="-m-1.5 rounded-2xl p-1.5 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {children}
    </Link>
  );
}

function Anel({ valor, label }: { valor: number | null; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = valor ?? 0;
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="6" />
        {valor !== null ? (
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        ) : null}
      </svg>
      <div className="leading-tight">
        <p className="font-heading text-xl font-bold">{valor === null ? "—" : `${valor}%`}</p>
        <p className="text-xs font-medium text-white/80">{label}</p>
      </div>
    </div>
  );
}

function Numero({ valor, label, icon: Icon }: { valor: string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
        <Icon className="h-6 w-6" />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-xl font-bold">{valor}</p>
        <p className="text-xs font-medium text-white/80">{label}</p>
      </div>
    </div>
  );
}

export function ClientHero({
  client,
  consultoraNome,
  indicadores,
  abaAtiva,
  hoje,
  processoId,
  fotoUrl,
}: {
  client: Client;
  consultoraNome: string | null;
  indicadores: {
    processosEmAndamento: number;
    checklistPct: number | null;
    formularioPct: number | null;
    pendentesCliente: number;
    proximoPrazo: string | null;
  };
  abaAtiva: string;
  hoje: string;
  /** Processo em andamento principal: para onde os indicadores levam. */
  processoId: string | null;
  fotoUrl: string | null;
}) {
  const noProcesso = (ancora: string) => (processoId ? `/processos/${processoId}#${ancora}` : null);
  const prazo = prazoRelativo(indicadores.proximoPrazo, hoje);
  const visto = client.visto_atual_subclasse
    ? `Visto ${client.visto_atual_subclasse}${
        client.visto_atual_validade
          ? ` · vale até ${new Date(`${client.visto_atual_validade}T00:00:00`).toLocaleDateString("pt-BR")}`
          : ""
      }`
    : null;
  const local = [client.cidade, client.pais].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-3xl bg-kmp-surface shadow-sm">
      <div className={`bg-gradient-to-br ${DEGRADE.lilas} px-5 py-5 text-white sm:px-6`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <FotoDoCliente clientId={client.id} fotoUrl={fotoUrl} iniciais={iniciais(client.nome)} />
            <div className="min-w-0">
              <h1 className="break-words font-heading text-2xl font-semibold leading-tight sm:text-3xl">{client.nome}</h1>
              <p className="mt-1 text-sm text-white/85">
                {[visto ?? (client.visto_aplicado ? `Aplicou: ${client.visto_aplicado}` : "Sem visto atual cadastrado"), local]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-0.5 text-sm text-white/85">
                Responsável: <span className="font-semibold text-white">{consultoraNome ?? "—"}</span>
              </p>
            </div>
          </div>

          {indicadores.processosEmAndamento > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:shrink-0">
              <Atalho href={noProcesso("checklist")} titulo="Abrir o checklist do processo">
                <Anel valor={indicadores.checklistPct} label="Checklist" />
              </Atalho>
              <Atalho href={noProcesso("formulario")} titulo="Abrir o formulário de dados">
                <Anel valor={indicadores.formularioPct} label="Formulário" />
              </Atalho>
              <Atalho href={noProcesso("checklist")} titulo="Ver os documentos pedidos ao cliente">
                <Numero
                  valor={String(indicadores.pendentesCliente)}
                  label={indicadores.pendentesCliente === 1 ? "doc. com o cliente" : "docs. com o cliente"}
                  icon={FolderOpen}
                />
              </Atalho>
              <Atalho href={`/clientes/${client.id}?tab=resumo#tarefas`} titulo="Ver tarefas e prazos do cliente">
                <Numero
                  valor={prazo ? prazo.texto : "—"}
                  label={prazo?.atrasado ? "prazo vencido" : "próximo prazo"}
                  icon={CalendarClock}
                />
              </Atalho>
            </div>
          ) : (
            <p className="rounded-2xl bg-white/15 px-4 py-3 text-sm">Nenhum processo em andamento.</p>
          )}
        </div>
      </div>

      <nav className="flex items-center justify-between gap-3 overflow-x-auto px-3 py-2.5 sm:px-4">
        <div className="flex gap-1.5">
          {ABAS_DO_CLIENTE.map((aba) => {
            const Icon = aba.icon;
            const ativa = abaAtiva === aba.slug;
            return (
              <Link
                key={aba.slug}
                href={`/clientes/${client.id}?tab=${aba.slug}`}
                aria-current={ativa ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  ativa
                    ? "bg-kmp-primary text-kmp-on-primary shadow-sm"
                    : "text-kmp-text/70 hover:bg-kmp-text/5 hover:text-kmp-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {aba.label}
              </Link>
            );
          })}
        </div>
        <Link
          href={`/clientes/${client.id}?tab=dados`}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-kmp-divider px-3.5 py-2 text-sm font-medium text-kmp-text/70 transition hover:text-kmp-text md:flex"
        >
          <Pencil className="h-4 w-4" />
          Editar dados
        </Link>
      </nav>
    </div>
  );
}
