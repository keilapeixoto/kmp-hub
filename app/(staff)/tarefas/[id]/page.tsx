import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamMembersStaff, getCases } from "@/lib/cases/data";
import { getClients } from "@/lib/clients/data";
import { getTask, getTaskComments, getTasks } from "@/lib/tasks/data";
import { addTaskComment, updateTask } from "../actions";
import { TaskForm } from "../_components/task-form";

export default async function TarefaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await getTask(id);
  if (!task) notFound();

  const [staff, clients, cases, otherTasks, comments] = await Promise.all([
    getTeamMembersStaff(),
    getClients({}),
    getCases({}),
    getTasks({}),
    getTaskComments(id),
  ]);

  const clientNameById = Object.fromEntries(clients.map((c) => [c.id, c.nome]));
  const staffName = (userId: string) =>
    staff.find((m) => m.user_id === userId)?.nome ?? "—";

  const dependency = task.dependencia_id
    ? otherTasks.find((t) => t.id === task.dependencia_id)
    : null;

  const updateWithId = updateTask.bind(null, id);
  const commentWithId = addTaskComment.bind(null, id);

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
          {task.titulo}
        </h1>
        {dependency && dependency.status !== "concluida" ? (
          <p className="mt-1 text-sm text-kmp-orange">
            ⚠ Depende de &quot;{dependency.titulo}&quot; (
            {dependency.status === "pendente" ? "pendente" : "em andamento"})
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          <TaskForm
            action={updateWithId}
            task={task}
            staff={staff}
            clients={clients}
            cases={cases}
            otherTasks={otherTasks}
            clientNameById={clientNameById}
          />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Comentários
          </h2>

          <div className="mt-4 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-kmp-graphite/60">
                Nenhum comentário ainda.
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-l-2 border-kmp-orange/30 pl-3"
                >
                  <p className="text-xs text-kmp-graphite/50">
                    {staffName(comment.autor)} ·{" "}
                    {new Date(comment.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-0.5 text-sm text-kmp-graphite">
                    {comment.texto}
                  </p>
                </div>
              ))
            )}
          </div>

          <form action={commentWithId} className="mt-6 space-y-3">
            <textarea
              name="texto"
              rows={3}
              required
              placeholder="Escreva um comentário…"
              className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Comentar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
