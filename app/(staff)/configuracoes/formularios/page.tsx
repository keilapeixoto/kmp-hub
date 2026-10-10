import { getCaseFormTemplates } from "@/lib/case-forms/data";

export default async function CaseFormTemplatesPage() {
  const templates = await getCaseFormTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Formulários de coleta de dados
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/60">
          O cliente preenche estes formulários direto no portal, em etapas —
          não é preciso enviar nada manualmente. Assim que ele tem acesso ao
          portal (aba &quot;Acesso ao portal&quot; na ficha do cliente) e o
          processo dele usa um dos tipos de serviço abaixo, o link
          &quot;Preencher formulário de dados&quot; já aparece sozinho na
          tela inicial do portal dele.
        </p>
      </div>

      <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
        {templates.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/50">
            Nenhum formulário cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
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
                  {t.etapas_count} etapas · {t.campos_count} campos
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
