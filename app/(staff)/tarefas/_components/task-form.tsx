"use client";

import { useActionState } from "react";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";
import type { Task } from "@/lib/tasks/types";
import type { TeamMember } from "@/lib/cases/data";
import type { Client } from "@/lib/clients/types";
import type { Case } from "@/lib/cases/types";
import type { TaskFormState } from "../actions";

const initialState: TaskFormState = { error: null };

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-graphite";

export function TaskForm({
  action,
  task,
  staff,
  clients,
  cases,
  otherTasks,
  clientNameById,
}: {
  action: (prevState: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task?: Task;
  staff: TeamMember[];
  clients: Client[];
  cases: Case[];
  otherTasks: Task[];
  clientNameById: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="titulo" className={labelClass}>
          Título *
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={task?.titulo ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="descricao" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={task?.descricao ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="responsavel" className={labelClass}>
            Responsável
          </label>
          <select
            id="responsavel"
            name="responsavel"
            defaultValue={task?.responsavel ?? ""}
            className={inputClass}
          >
            <option value="">Eu mesmo(a)</option>
            {staff.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="participantes" className={labelClass}>
            Participantes (Ctrl/Cmd para vários)
          </label>
          <select
            id="participantes"
            name="participantes"
            multiple
            defaultValue={task?.participantes ?? []}
            className={`${inputClass} h-24`}
          >
            {staff.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prioridade" className={labelClass}>
            Prioridade
          </label>
          <select
            id="prioridade"
            name="prioridade"
            defaultValue={task?.prioridade ?? "media"}
            className={inputClass}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prazo" className={labelClass}>
            Prazo
          </label>
          <input
            id="prazo"
            name="prazo"
            type="date"
            defaultValue={task?.prazo ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={task?.status ?? "pendente"}
            className={inputClass}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dependencia_id" className={labelClass}>
            Depende da tarefa
          </label>
          <select
            id="dependencia_id"
            name="dependencia_id"
            defaultValue={task?.dependencia_id ?? ""}
            className={inputClass}
          >
            <option value="">Nenhuma</option>
            {otherTasks
              .filter((t) => t.id !== task?.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="client_id" className={labelClass}>
            Cliente
          </label>
          <select
            id="client_id"
            name="client_id"
            defaultValue={task?.client_id ?? ""}
            className={inputClass}
          >
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="case_id" className={labelClass}>
            Processo
          </label>
          <select
            id="case_id"
            name="case_id"
            defaultValue={task?.case_id ?? ""}
            className={inputClass}
          >
            <option value="">Nenhum</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {clientNameById[c.client_id] ?? "Cliente"} — processo
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
