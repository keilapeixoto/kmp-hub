import type { CaseStage } from "@/lib/cases/types";
import { addCaseStage, removeCaseStage } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function CaseStagesPanel({
  serviceTypeId,
  stages,
  isAdmin,
}: {
  serviceTypeId: string;
  stages: CaseStage[];
  isAdmin: boolean;
}) {
  const addWithId = addCaseStage.bind(null, serviceTypeId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow-sm">
        {stages.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhuma etapa cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {stages.map((stage) => {
              const removeWithIds = removeCaseStage.bind(
                null,
                serviceTypeId,
                stage.id,
              );
              return (
                <li
                  key={stage.id}
                  className="flex items-center justify-between p-4 text-sm"
                >
                  <span className="text-kmp-graphite">
                    <span className="mr-2 text-kmp-graphite/40">
                      {stage.ordem}.
                    </span>
                    {stage.nome}
                  </span>
                  {isAdmin ? (
                    <form action={removeWithIds}>
                      <button
                        type="submit"
                        className="text-xs text-kmp-graphite/60 transition hover:text-red-600"
                      >
                        Remover
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Adicionar etapa
          </h2>
          <form
            action={addWithId}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-kmp-graphite">
                Nome
              </label>
              <input name="nome" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Ordem
              </label>
              <input
                name="ordem"
                type="number"
                min={1}
                defaultValue={stages.length + 1}
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
