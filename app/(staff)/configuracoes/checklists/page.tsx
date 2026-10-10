import Link from "next/link";
import { getChecklistTemplates } from "@/lib/checklists/data";

export default async function ChecklistTemplatesPage() {
  const templates = await getChecklistTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Checklists
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/60">
          Templates de checklist usados nos processos, um por tipo de
          serviço.
        </p>
      </div>

      <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
        {templates.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/50">
            Nenhum checklist cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {templates.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/configuracoes/checklists/${t.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-white/5"
                >
                  <span>
                    <span className="font-medium text-white">
                      {t.nome}
                    </span>
                    {t.service_type_nome ? (
                      <span className="ml-3 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">
                        {t.service_type_nome}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-white/40">
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
