"use client";

import { useOptimistic, useTransition } from "react";
import { Check, ListChecks } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import type { TarefaDaEtapa } from "@/lib/cases/stage-tasks";
import { gerarTarefasDaEtapa, marcarTarefaDaEtapa } from "../actions";

// Pipeline por tarefas: as tarefas da etapa atual do processo. Concluída a
// última, o banco passa o processo para a próxima etapa sozinho.

const ENCERRADAS = ["concluida", "cancelada"];

export function StageTasksCard({
  caseId,
  etapaNome,
  proximaEtapa,
  tarefas,
  temTarefasPadrao,
  staffNameById,
}: {
  caseId: string;
  etapaNome: string;
  proximaEtapa: string | null;
  tarefas: TarefaDaEtapa[];
  temTarefasPadrao: boolean;
  staffNameById: Record<string, string>;
}) {
  const [pendente, startTransition] = useTransition();
  const [lista, marcar] = useOptimistic(tarefas, (atual, mudanca: { id: string; concluida: boolean }) =>
    atual.map((t) => (t.id === mudanca.id ? { ...t, status: mudanca.concluida ? "concluida" : "pendente" } : t)),
  );
  const feitas = lista.filter((t) => ENCERRADAS.includes(t.status)).length;

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo
        titulo={`Tarefas da etapa: ${etapaNome}`}
        cor="verde"
        icon={ListChecks}
        direita={lista.length > 0 ? `${feitas}/${lista.length}` : undefined}
      />

      {lista.length === 0 ? (
        temTarefasPadrao ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/75">
            Este processo já estava nesta etapa antes das tarefas padrão existirem.
            <button
              type="button"
              disabled={pendente}
              onClick={() => startTransition(() => gerarTarefasDaEtapa(caseId))}
              className="rounded-full bg-kmp-primary px-4 py-1.5 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
            >
              {pendente ? "Gerando…" : "Gerar tarefas desta etapa"}
            </button>
          </div>
        ) : (
          <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">
            Esta etapa não tem tarefas padrão. Para cadastrar, abra a Pipeline deste visto e use
            &quot;Editar etapas desta pipeline&quot;.
          </p>
        )
      ) : (
        <>
          <div className="mb-3 h-2 rounded-full bg-kmp-text/10">
            <div className="h-2 rounded-full bg-kmp-orange" style={{ width: `${(feitas / lista.length) * 100}%` }} />
          </div>
          <ul className="space-y-1">
            {lista.map((t) => {
              const feita = ENCERRADAS.includes(t.status);
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-kmp-text/5">
                    <input
                      type="checkbox"
                      checked={feita}
                      disabled={pendente || t.status === "cancelada"}
                      onChange={(e) => {
                        const concluida = e.target.checked;
                        startTransition(async () => {
                          marcar({ id: t.id, concluida });
                          await marcarTarefaDaEtapa(caseId, t.id, concluida);
                        });
                      }}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-kmp-orange ${
                        feita ? "border-kmp-orange bg-kmp-orange text-white" : "border-kmp-text/30"
                      }`}
                    >
                      {feita ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span className={`flex-1 text-sm ${feita ? "text-kmp-text/50 line-through" : "text-kmp-text"}`}>
                      {t.titulo}
                    </span>
                    <span className="hidden text-xs text-kmp-text/60 sm:inline">
                      {staffNameById[t.responsavel] ?? ""}
                    </span>
                    {t.prazo ? (
                      <span className="text-xs text-kmp-text/60">
                        {new Date(`${t.prazo.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-kmp-text/60">
            {proximaEtapa
              ? `Concluídas todas, o processo passa sozinho para "${proximaEtapa}".`
              : "Esta é a última etapa: concluir as tarefas não encerra o processo."}
          </p>
        </>
      )}
    </section>
  );
}
