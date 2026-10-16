import Link from "next/link";
import { BarChart3, ListChecks } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import { getTeamMembersStaff } from "@/lib/cases/data";
import { getClients } from "@/lib/clients/data";
import { iniciais } from "@/lib/clients/perfil-calc";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";
import { getTasks, getWorkload } from "@/lib/tasks/data";
import type { TaskFilters } from "@/lib/tasks/types";
import { TaskDeadlineInput, TaskPrioritySelect, TaskStatusSelect } from "./_components/task-quick-edit";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const selectClass =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "mb-1 block text-xs font-semibold text-kmp-text/70";

const colunas =
  "md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_7.5rem_9rem_9.5rem]";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters: TaskFilters = {
    status: firstValue(params.status),
    prioridade: firstValue(params.prioridade),
    responsavel: firstValue(params.responsavel),
  };

  const [tasks, staff, workload, clients] = await Promise.all([
    getTasks(filters),
    getTeamMembersStaff(),
    getWorkload(),
    getClients({}),
  ]);

  const staffName = (id: string) => staff.find((m) => m.user_id === id)?.nome ?? "—";
  const clienteNome = Object.fromEntries(clients.map((c) => [c.id, c.nome]));
  const hoje = new Date().toISOString().slice(0, 10);
  const maxLoad = Math.max(1, ...Array.from(workload.values()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-text">Tarefas</h1>
        <Link
          href="/tarefas/nova"
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          Nova tarefa
        </Link>
      </div>

      {workload.size > 0 ? (
        <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
          <FaixaTitulo titulo="Carga da equipe (tarefas abertas)" cor="amarelo" icon={BarChart3} />
          <div className="space-y-2">
            {Array.from(workload.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([userId, count]) => (
                <div key={userId} className="flex items-center gap-3 text-sm">
                  <span className="w-44 truncate text-kmp-text/80">{staffName(userId)}</span>
                  <div className="h-2 flex-1 rounded-full bg-kmp-text/10">
                    <div className="h-2 rounded-full bg-kmp-orange" style={{ width: `${(count / maxLoad) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold text-kmp-text/70">{count}</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <form method="GET" className="rounded-3xl bg-kmp-surface p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="filtro-status" className={labelClass}>Status</label>
            <select id="filtro-status" name="status" defaultValue={filters.status ?? ""} className={selectClass}>
              <option value="">Todos</option>
              {TASK_STATUSES.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-prioridade" className={labelClass}>Prioridade</label>
            <select id="filtro-prioridade" name="prioridade" defaultValue={filters.prioridade ?? ""} className={selectClass}>
              <option value="">Todas</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-responsavel" className={labelClass}>Responsável</label>
            <select id="filtro-responsavel" name="responsavel" defaultValue={filters.responsavel ?? ""} className={selectClass}>
              <option value="">Todos</option>
              {staff.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.nome}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="submit" className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90">
            Filtrar
          </button>
          <Link href="/tarefas" className="rounded-full px-4 py-2 text-sm font-medium text-kmp-text/70 transition hover:text-kmp-text">
            Limpar filtros
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
        <FaixaTitulo
          titulo="Tarefas"
          cor="azul"
          icon={ListChecks}
          direita={`${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`}
        />
        {tasks.length === 0 ? (
          <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">Nenhuma tarefa encontrada.</p>
        ) : (
          <div>
            <div className={`hidden gap-4 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/50 md:grid ${colunas}`}>
              <span>Tarefa</span>
              <span>Responsável</span>
              <span>Prioridade</span>
              <span>Prazo</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-kmp-divider">
              {tasks.map((task) => {
                const aberta = task.status === "pendente" || task.status === "em_andamento";
                const atrasada = Boolean(task.prazo && task.prazo.slice(0, 10) < hoje && aberta);
                const nome = staffName(task.responsavel);
                return (
                  <li key={task.id} className={`grid grid-cols-1 gap-2 px-3 py-3 md:items-center md:gap-4 ${colunas}`}>
                    <span className="min-w-0">
                      <Link
                        href={`/tarefas/${task.id}`}
                        className={`block truncate font-medium hover:text-kmp-orange ${aberta ? "text-kmp-text" : "text-kmp-text/50 line-through"}`}
                      >
                        {task.titulo}
                      </Link>
                      {task.client_id && clienteNome[task.client_id] ? (
                        <Link
                          href={`/clientes/${task.client_id}`}
                          className="block truncate text-xs text-kmp-text/60 hover:text-kmp-orange"
                        >
                          {clienteNome[task.client_id]}
                        </Link>
                      ) : null}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-sm text-kmp-text/80">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kmp-text/10 text-xs font-semibold text-kmp-text/70"
                      >
                        {iniciais(nome)}
                      </span>
                      <span className="truncate">{nome}</span>
                    </span>
                    <span>
                      <TaskPrioritySelect id={task.id} prioridade={task.prioridade} />
                    </span>
                    <span>
                      <TaskDeadlineInput id={task.id} prazo={task.prazo ? task.prazo.slice(0, 10) : null} atrasada={atrasada} />
                    </span>
                    <span>
                      <TaskStatusSelect id={task.id} status={task.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
