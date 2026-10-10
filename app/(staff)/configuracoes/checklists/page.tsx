import Link from "next/link";
import { getChecklistTemplates } from "@/lib/checklists/data";

export default async function ChecklistTemplatesPage() {
  const templates = await getChecklistTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-text">
          Checklists
        </h1>
        <p className="mt-1 text-sm text-kmp-text/60">
          Templates de checklist usados nos processos, um por tipo de
          serviço.
        </p>
      </div>

      <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        {templates.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-text/50">
            Nenhum checklist cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-kmp-divider">
            {templates.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/configuracoes/checklists/${t.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-kmp-divider"
                >
                  <span>
                    <span className="font-medium text-kmp-text">
                      {t.nome}
                    </span>
                    {t.service_type_nome ? (
                      <span className="ml-3 rounded-full bg-kmp-divider px-2 py-0.5 text-xs font-medium text-kmp-text/70">
                        {t.service_type_nome}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-kmp-text/40">
                    {t.itens_count}{" "}
                    {t.itens_count === 1 ? "item" : "itens"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
