import Link from "next/link";
import { getPortalCases } from "@/lib/portal/data";
import { PortalHeader } from "./_components/portal-header";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default async function PortalHomePage() {
  const cases = await getPortalCases();

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
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/portal/documentos?processo=${c.id}`}
                className="block rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
              >
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
                <p className="mt-4 text-sm font-medium text-kmp-orange">
                  Ver documentos e checklist →
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
