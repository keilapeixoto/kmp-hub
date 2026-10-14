import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import type { CaseStage } from "@/lib/cases/types";
import { addStage, deleteStage, moveStage, renameStage } from "../stage-actions";

// Editor das etapas (colunas) da pipeline de um tipo de serviço. Só aparece
// para admin (quem o banco deixa alterar).
export function StagesEditor({
  serviceTypeId,
  stages,
  contagem,
  erro,
  aberto,
}: {
  serviceTypeId: string;
  stages: CaseStage[];
  contagem: Record<string, number>;
  erro: string | null;
  aberto: boolean;
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
