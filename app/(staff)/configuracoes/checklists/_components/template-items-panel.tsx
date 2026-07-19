import type { ChecklistTemplateItem } from "@/lib/checklists/types";
import { addChecklistTemplateItem, removeChecklistTemplateItem } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function TemplateItemsPanel({
  templateId,
  items,
  isAdmin,
}: {
  templateId: string;
  items: ChecklistTemplateItem[];
  isAdmin: boolean;
}) {
  const addWithId = addChecklistTemplateItem.bind(null, templateId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow-sm">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhum item cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {items.map((item) => {
              const removeWithIds = removeChecklistTemplateItem.bind(
                null,
                templateId,
                item.id,
              );
              return (
                <li key={item.id} className="p-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="mr-2 text-kmp-graphite/40">
                        {item.ordem}.
                      </span>
                      <span className="font-medium text-kmp-graphite">
                        {item.nome}
                      </span>
                      {!item.obrigatorio ? (
                        <span className="ml-2 text-xs text-kmp-graphite/40">
                          (opcional)
                        </span>
                      ) : null}
                      {item.condicional ? (
                        <span className="ml-2 text-xs text-kmp-graphite/40">
                          (condicional)
                        </span>
                      ) : null}
                      {item.descricao ? (
                        <p className="mt-1 text-xs text-kmp-graphite/60">
                          {item.descricao}
                        </p>
                      ) : null}
                    </div>
                    {isAdmin ? (
                      <form action={removeWithIds}>
                        <button
                          type="submit"
                          className="shrink-0 text-xs text-kmp-graphite/60 transition hover:text-red-600"
                        >
                          Remover
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Adicionar item
          </h2>
          <form action={addWithId} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
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
                defaultValue={items.length + 1}
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-kmp-graphite">
                Descrição
              </label>
              <textarea name="descricao" rows={2} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Exemplo
              </label>
              <input name="exemplo" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Formato aceito
              </label>
              <input
                name="formato"
                placeholder="PDF, JPG…"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Validade (dias, opcional)
              </label>
              <input
                name="validade_dias"
                type="number"
                min={1}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-kmp-graphite">
                <input type="checkbox" name="obrigatorio" defaultChecked />
                Obrigatório
              </label>
              <label className="flex items-center gap-2 text-sm text-kmp-graphite">
                <input type="checkbox" name="condicional" />
                Condicional
              </label>
            </div>
            <div className="sm:col-span-2">
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
