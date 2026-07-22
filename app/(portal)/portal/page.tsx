import Link from "next/link";
import { getPortalCases } from "@/lib/portal/data";
import { getCaseFormTemplateForCase } from "@/lib/case-forms/data";
import { PortalHeader } from "./_components/portal-header";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  arquivado: "Concluído",
};

export default async function PortalHomePage() {
  const cases = await getPortalCases();
  const hasForm = await Promise.all(
    cases.map((c) => getCaseFormTemplateForCase(c.id)),
  );

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Seus processos
        </h1>

        {cases.length === 0 ? (
          <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
            Nenhum processo vinculado à sua conta ainda. Fale com sua
            consultora se isso não parecer certo.
          </p>
        ) : (
          <div className="space-y-4">
            {cases.map((c, i) => (
              <div key={c.id} className="rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-lg text-kmp-graphite">
                      {c.service_type_nome ?? "Processo"}
                    </p>
                    <p className="mt-1 text-sm text-kmp-graphite/60">
                      {c.client_nome}
                    </p>
                  </div>
                  <span className="rounded-full bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite/70">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  <Link
                    href={`/portal/documentos?processo=${c.id}`}
                    className="text-sm font-medium text-kmp-orange hover:underline"
                  >
                    Ver documentos e checklist →
                  </Link>
                  {hasForm[i] ? (
                    <Link
                      href={`/portal/formulario?processo=${c.id}`}
                      className="text-sm font-medium text-kmp-orange hover:underline"
                    >
                      Preencher formulário de dados →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
