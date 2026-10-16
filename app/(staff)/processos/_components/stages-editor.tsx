import { ArrowDown, ArrowUp, ListChecks, Plus, Settings2, Trash2, X } from "lucide-react";
import type { CaseStage } from "@/lib/cases/types";
import type { StageTask } from "@/lib/cases/stage-tasks";
import { addStage, addStageTask, deleteStage, deleteStageTask, moveStage, renameStage } from "../stage-actions";

// Editor das etapas (colunas) da pipeline de um tipo de serviço. Só aparece
// para admin (quem o banco deixa alterar).
export function StagesEditor({
  serviceTypeId,
  stages,
  contagem,
  erro,
  aberto,
  stageTasks,
}: {
  serviceTypeId: string;
  stages: CaseStage[];
  contagem: Record<string, number>;
  erro: string | null;
  aberto: boolean;
  /** Tarefas padrão de cada etapa: concluídas todas, o processo avança sozinho. */
  stageTasks: Record<string, StageTask[]>;
}) {
  const ordenadas = [...stages].sort((a, b) => a.ordem - b.ordem);
  const botao =
    "flex h-8 w-8 items-center justify-center rounded-full bg-kmp-text/5 text-kmp-text/70 transition hover:bg-kmp-text/10 disabled:opacity-30";
  return (
    <details open={aberto} className="rounded-3xl bg-kmp-surface p-3 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-kmp-text">
        <Settings2 className="h-4 w-4" /> Editar etapas desta pipeline
      </summary>
      {erro ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      ) : null}
      <ol className="mt-3 space-y-2">
        {ordenadas.map((st, i) => (
          <li key={st.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 p-2 dark:bg-white/5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kmp-primary text-xs font-bold text-kmp-on-primary">
              {i + 1}
            </span>
            <form action={renameStage.bind(null, serviceTypeId, st.id)} className="flex min-w-0 flex-1 items-center gap-2">
              <input
                name="nome"
                defaultValue={st.nome}
                className="min-w-0 flex-1 rounded-full border border-kmp-divider bg-transparent px-3 py-1.5 text-sm text-kmp-text"
              />
              <button type="submit" className="rounded-full bg-kmp-text/5 px-3 py-1.5 text-xs font-semibold text-kmp-text hover:bg-kmp-text/10">
                Salvar nome
              </button>
            </form>
            <span className="text-xs text-kmp-text/60">{contagem[st.id] ?? 0} processo(s)</span>
            <form action={moveStage.bind(null, serviceTypeId, st.id, "subir")}>
              <button type="submit" aria-label="Subir etapa" disabled={i === 0} className={botao}>
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
            <form action={moveStage.bind(null, serviceTypeId, st.id, "descer")}>
              <button type="submit" aria-label="Descer etapa" disabled={i === ordenadas.length - 1} className={botao}>
                <ArrowDown className="h-4 w-4" />
              </button>
            </form>
            <form action={deleteStage.bind(null, serviceTypeId, st.id)}>
              <button type="submit" aria-label="Remover etapa" className={`${botao} hover:text-red-600`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
            <div className="w-full pl-9">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-kmp-text/70">
                <ListChecks className="h-3.5 w-3.5" />
                Tarefas desta etapa
                <span className="font-normal text-kmp-text/50">
                  {(stageTasks[st.id] ?? []).length > 0
                    ? "· concluídas todas, o processo passa sozinho para a próxima etapa"
                    : "· sem tarefas, a etapa muda só à mão"}
                </span>
              </p>
              {(stageTasks[st.id] ?? []).length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {(stageTasks[st.id] ?? []).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-1 rounded-full bg-kmp-text/5 py-1 pl-3 pr-1 text-xs text-kmp-text"
                    >
                      {t.titulo}
                      {t.prazo_dias !== null ? (
                        <span className="text-kmp-text/50">
                          · {t.prazo_dias} {t.prazo_dias === 1 ? "dia" : "dias"}
                        </span>
                      ) : null}
                      <form action={deleteStageTask.bind(null, serviceTypeId, t.id)}>
                        <button
                          type="submit"
                          aria-label={`Remover a tarefa ${t.titulo}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-kmp-text/50 hover:bg-kmp-text/10 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
              <form action={addStageTask.bind(null, serviceTypeId, st.id)} className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <input
                  name="titulo"
                  aria-label={`Nova tarefa da etapa ${st.nome}`}
                  placeholder="Nova tarefa (ex.: Conferir passaporte)"
                  className="min-w-0 flex-1 rounded-full border border-kmp-divider bg-transparent px-3 py-1 text-xs text-kmp-text"
                />
                <input
                  name="prazo_dias"
                  type="number"
                  min={0}
                  max={365}
                  aria-label="Prazo em dias"
                  placeholder="dias"
                  className="w-20 rounded-full border border-kmp-divider bg-transparent px-3 py-1 text-xs text-kmp-text"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-full bg-kmp-text/5 px-3 py-1 text-xs font-semibold text-kmp-text hover:bg-kmp-text/10"
                >
                  <Plus className="h-3 w-3" /> Tarefa
                </button>
              </form>
            </div>
          </li>
        ))}
      </ol>
      <form action={addStage.bind(null, serviceTypeId)} className="mt-3 flex items-center gap-2">
        <input
          name="nome"
          placeholder="Nova etapa (ex.: Aguardando documentos)"
          className="min-w-0 flex-1 rounded-full border border-kmp-divider bg-transparent px-3 py-2 text-sm text-kmp-text"
        />
        <button type="submit" className="flex items-center gap-1 rounded-full bg-kmp-primary px-4 py-2 text-sm font-semibold text-kmp-on-primary">
          <Plus className="h-4 w-4" /> Adicionar etapa
        </button>
      </form>
    </details>
  );
}
