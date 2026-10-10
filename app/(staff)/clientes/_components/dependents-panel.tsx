import Link from "next/link";
import {
  CLIENT_RELATION_TYPES,
  CLIENT_RELATION_TYPE_LABELS,
} from "@/lib/clients/constants";
import type { ClientRelationWithRelated } from "@/lib/clients/types";
import { addDependent, removeDependent } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function DependentsPanel({
  clientId,
  relations,
}: {
  clientId: string;
  relations: ClientRelationWithRelated[];
}) {
  const addWithId = addDependent.bind(null, clientId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-kmp-surface p-6 shadow-sm">
        <h2 className="font-heading text-lg text-kmp-text">
          Adicionar dependente
        </h2>
        <form action={addWithId} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-kmp-text">
              Nome
            </label>
            <input name="nome" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-kmp-text">
              Relação
            </label>
            <select name="tipo" defaultValue="filho" className={inputClass}>
              {CLIENT_RELATION_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
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

      <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        {relations.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-text/50">
            Nenhum dependente cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-kmp-divider">
            {relations.map((rel) => {
              const removeWithIds = removeDependent.bind(
                null,
                clientId,
                rel.id,
              );
              return (
                <li
                  key={rel.id}
                  className="flex items-center justify-between p-4 text-sm"
                >
                  <div>
                    <Link
                      href={`/clientes/${rel.related_client_id}`}
                      className="font-medium text-kmp-text hover:text-kmp-orange"
                    >
                      {rel.related?.nome ?? "—"}
                    </Link>
                    <p className="text-kmp-text/50">
                      {CLIENT_RELATION_TYPE_LABELS[rel.tipo] ?? rel.tipo}
                    </p>
                  </div>
                  <form action={removeWithIds}>
                    <button
                      type="submit"
                      className="text-xs text-kmp-text/50 transition hover:text-red-400"
                    >
                      Remover vínculo
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
