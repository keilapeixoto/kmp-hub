import Link from "next/link";
import { getTeamMembersStaff, getCases } from "@/lib/cases/data";
import { getClients } from "@/lib/clients/data";
import { getTasks } from "@/lib/tasks/data";
import { createTask } from "../actions";
import { TaskForm } from "../_components/task-form";

export default async function NovaTarefaPage() {
  const [staff, clients, cases, otherTasks] = await Promise.all([
    getTeamMembersStaff(),
    getClients({}),
    getCases({}),
    getTasks({}),
  ]);

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.nome]));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tarefas"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Tarefas
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          Nova tarefa
        </h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <TaskForm
          action={createTask}
          staff={staff}
          clients={clients}
          cases={cases}
          otherTasks={otherTasks}
          clientNameById={clientNameById}
        />
      </div>
    </div>
  );
}
