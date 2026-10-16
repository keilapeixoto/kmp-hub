"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Star, Trash2 } from "lucide-react";
import { excluirTarefa, updateTaskField } from "../actions";

// Controles rápidos da linha da tarefa (out/2026, referência da Keila no
// estilo Microsoft To Do): círculo para concluir, estrela de importante e
// lixeira. Concluir uma tarefa de etapa pode avançar o processo sozinho.

export function TaskDoneCircle({ id, status, titulo }: { id: string; status: string; titulo: string }) {
  const [feita, setFeita] = useState(status === "concluida");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={feita}
      aria-label={feita ? `Reabrir: ${titulo}` : `Concluir: ${titulo}`}
      disabled={pendente}
      onClick={() => {
        const novo = !feita;
        setFeita(novo);
        iniciar(async () => {
          const r = await updateTaskField(id, "status", novo ? "concluida" : "pendente");
          if (r.error) setFeita(!novo);
          router.refresh();
        });
      }}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
        feita
          ? "border-[#5f92f2] bg-[#5f92f2] text-white"
          : "border-kmp-text/30 text-transparent hover:border-[#5f92f2] hover:text-[#5f92f2]"
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}

export function TaskStar({ id, prioridade }: { id: string; prioridade: string }) {
  const [alta, setAlta] = useState(prioridade === "alta");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={alta}
      aria-label={alta ? "Tirar de importante" : "Marcar como importante"}
      title={alta ? "Importante (prioridade alta)" : "Marcar como importante"}
      disabled={pendente}
      onClick={() => {
        const novo = !alta;
        setAlta(novo);
        iniciar(async () => {
          const r = await updateTaskField(id, "prioridade", novo ? "alta" : "media");
          if (r.error) setAlta(!novo);
          router.refresh();
        });
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full text-kmp-text/40 transition hover:bg-kmp-text/5 hover:text-[#5f92f2]"
    >
      <Star className={`h-4.5 w-4.5 ${alta ? "fill-[#5f92f2] text-[#5f92f2]" : ""}`} />
    </button>
  );
}

export function TaskDelete({ id, titulo }: { id: string; titulo: string }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={`Excluir: ${titulo}`}
      title="Excluir tarefa"
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Excluir a tarefa "${titulo}"?`)) return;
        iniciar(async () => {
          const r = await excluirTarefa(id);
          if (r.error) alert(r.error);
          router.refresh();
        });
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full text-kmp-text/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
