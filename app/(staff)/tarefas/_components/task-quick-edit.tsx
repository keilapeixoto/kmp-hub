"use client";

import { useState, useTransition } from "react";
import { SUAVE, type CorViva } from "@/components/ui/vivid";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";
import { updateTaskField } from "../actions";

// Edição rápida na lista de tarefas (out/2026, pedido da Keila: "não consigo
// mudar nada"): status, prioridade e prazo mudam direto na linha.

const COR_STATUS: Record<string, CorViva> = {
  pendente: "azul",
  em_andamento: "amarelo",
  concluida: "verde",
  cancelada: "cinza",
};

const COR_PRIORIDADE: Record<string, CorViva> = {
  alta: "vermelho",
  media: "laranja",
  baixa: "cinza",
};

const pilula =
  "cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-kmp-orange disabled:opacity-60";

type Campo = "status" | "prioridade" | "prazo";

function useCampo(id: string, campo: Campo, inicial: string) {
  const [valor, setValor] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();
  const mudar = (novo: string) => {
    const anterior = valor;
    setValor(novo);
    setErro(null);
    startTransition(async () => {
      const r = await updateTaskField(id, campo, novo);
      if (r.error) {
        setValor(anterior);
        setErro(r.error);
      }
    });
  };
  return { valor, mudar, erro, salvando };
}

export function TaskStatusSelect({ id, status }: { id: string; status: string }) {
  const c = useCampo(id, "status", status);
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Status da tarefa"
        value={c.valor}
        disabled={c.salvando}
        onChange={(e) => c.mudar(e.target.value)}
        className={`${pilula} ${SUAVE[COR_STATUS[c.valor] ?? "cinza"]}`}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.label}
          </option>
        ))}
      </select>
      {c.erro ? <span className="mt-0.5 text-xs text-red-600 dark:text-red-400">{c.erro}</span> : null}
    </span>
  );
}

export function TaskPrioritySelect({ id, prioridade }: { id: string; prioridade: string }) {
  const c = useCampo(id, "prioridade", prioridade);
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Prioridade da tarefa"
        value={c.valor}
        disabled={c.salvando}
        onChange={(e) => c.mudar(e.target.value)}
        className={`${pilula} ${SUAVE[COR_PRIORIDADE[c.valor] ?? "cinza"]}`}
      >
        {TASK_PRIORITIES.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.label}
          </option>
        ))}
      </select>
      {c.erro ? <span className="mt-0.5 text-xs text-red-600 dark:text-red-400">{c.erro}</span> : null}
    </span>
  );
}

export function TaskDeadlineInput({
  id,
  prazo,
  atrasada,
}: {
  id: string;
  prazo: string | null;
  atrasada: boolean;
}) {
  const c = useCampo(id, "prazo", prazo ?? "");
  return (
    <span className="inline-flex flex-col">
      <input
        type="date"
        aria-label="Prazo da tarefa"
        value={c.valor}
        disabled={c.salvando}
        onChange={(e) => c.mudar(e.target.value)}
        className={`rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange disabled:opacity-60 ${
          atrasada ? "border-[#ef6b7d] text-[#b0283b]" : ""
        }`}
      />
      {atrasada && !c.erro ? <span className="mt-0.5 text-xs font-semibold text-[#b0283b] dark:text-[#f4a3ae]">Atrasada</span> : null}
      {c.erro ? <span className="mt-0.5 text-xs text-red-600 dark:text-red-400">{c.erro}</span> : null}
    </span>
  );
}
