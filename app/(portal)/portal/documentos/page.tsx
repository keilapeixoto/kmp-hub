import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPortalCase,
  getPortalCases,
  getPortalChecklistItems,
  getPortalDocumentsByChecklistItem,
} from "@/lib/portal/data";
import { CHECKLIST_ITEM_STATUS_LABELS } from "@/lib/checklists/constants";
import { PortalHeader } from "../_components/portal-header";
import { PortalUploadForm } from "../_components/portal-upload-form";

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_COLORS: Record<string, string> = {
  nao_solicitado: "bg-kmp-graphite/10 text-kmp-graphite/60",
  solicitado: "bg-blue-100 text-blue-700",
  aguardando_cliente: "bg-amber-100 text-amber-700",
  enviado: "bg-blue-100 text-blue-700",
  em_analise: "bg-blue-100 text-blue-700",
  rejeitado: "bg-red-100 text-red-700",
  reenvio_solicitado: "bg-amber-100 text-amber-700",
  reenviado: "bg-blue-100 text-blue-700",
  aguardando_aprovacao: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
};

export default async function PortalDocumentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const processoParam = Array.isArray(sp.processo) ? sp.processo[0] : sp.processo;

  let caseId = processoParam ?? null;
  if (!caseId) {
    const cases = await getPortalCases();
    if (cases.length === 0) notFound();
    caseId = cases[0].id;
  }

  const [portalCase, items, documentsByItem] = await Promise.all([
    getPortalCase(caseId),
    getPortalChecklistItems(caseId),
    getPortalDocumentsByChecklistItem(caseId),
  ]);

  if (!portalCase) notFound();

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <Link href="/portal" className="text-sm text-kmp-graphite/60 hover:text-kmp-orange">
            ← Seus processos
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {portalCase.service_type_nome ?? "Processo"}
          </h1>
          <p className="text-sm text-kmp-graphite/60">
            Envie aqui os documentos pedidos pela equipe. Assim que sobem,
            já aparecem no sistema para análise.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
            Nenhum checklist criado para este processo ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const sentDocs = documentsByItem[item.id] ?? [];
              return (
                <div key={item.id} className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-kmp-graphite">{item.nome}</p>
                      {item.descricao ? (
                        <p className="mt-1 text-sm text-kmp-graphite/60">
                          {item.descricao}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[item.status] ?? "bg-kmp-graphite/10 text-kmp-graphite/60"
                      }`}
                    >
                      {CHECKLIST_ITEM_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>

                  {item.status === "rejeitado" && item.motivo_rejeicao ? (
                    <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                      Motivo da rejeição: {item.motivo_rejeicao}
                    </p>
                  ) : null}

                  {item.observacao_equipe ? (
                    <p className="mt-3 text-sm text-kmp-graphite/70">
                      Observação da equipe: {item.observacao_equipe}
                    </p>
                  ) : null}

                  {sentDocs.length > 0 ? (
                    <p className="mt-3 text-xs text-kmp-graphite/50">
                      {sentDocs.length} arquivo{sentDocs.length === 1 ? "" : "s"} enviado
                      {sentDocs.length === 1 ? "" : "s"}.
                    </p>
                  ) : null}

                  <PortalUploadForm
                    clientId={portalCase.client_id}
                    caseId={portalCase.id}
                    checklistItemId={item.id}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
