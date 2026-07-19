import Link from "next/link";
import { getTeamMembersStaff } from "@/lib/cases/data";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/tasks/constants";
import { getTasks, getWorkload } from "@/lib/tasks/data";
import type { TaskFilters } from "@/lib/tasks/types";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

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

  const [tasks, staff, workload] = await Promise.all([
    getTasks(filters),
    getTeamMembersStaff(),
    getWorkload(),
  ]);

  const staffName = (id: string) =>
    staff.find((m) => m.user_id === id)?.nome ?? "—";

  const maxLoad = Math.max(1, ...Array.from(workload.values()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">Tarefas</h1>
        <Link
          href="/tarefas/nova"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Nova tarefa
        </Link>
      </div>

      {workload.size > 0 ? (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            Carga da equipe (tarefas abertas)
          </h2>
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
        </div>
      ) : null}

      <form
        method="GET"
        className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={filters.status ?? ""} className={inputClass}>
            <option value="">Todos</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Prioridade</label>
          <select
            name="prioridade"
            defaultValue={filters.prioridade ?? ""}
            className={inputClass}
          >
            <option value="">Todas</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Responsável</label>
          <select
            name="responsavel"
            defaultValue={filters.responsavel ?? ""}
            className={inputClass}
          >
            <option value="">Todos</option>
            {staff.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Filtrar
          </button>
          <Link
            href="/tarefas"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
          >
            Limpar
          </Link>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Nenhuma tarefa encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
              <tr>
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Prazo</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const overdue =
                  task.prazo &&
                  new Date(task.prazo) < new Date() &&
                  (task.status === "pendente" || task.status === "em_andamento");
                return (
                  <tr key={task.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tarefas/${task.id}`}
                        className="font-medium text-kmp-graphite hover:text-kmp-orange"
                      >
                        {task.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {staffName(task.responsavel)}
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {TASK_PRIORITY_LABELS[task.prioridade]}
                    </td>
                    <td className="px-4 py-3">
                      {task.prazo ? (
                        <span className={overdue ? "font-medium text-kmp-orange" : "text-kmp-graphite/80"}>
                          {overdue ? "⚠ " : ""}
                          {new Date(task.prazo).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-kmp-graphite/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {TASK_STATUS_LABELS[task.status]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
