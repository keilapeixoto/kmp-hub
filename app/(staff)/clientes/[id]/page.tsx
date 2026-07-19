import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserProfile, getCurrentUserRole } from "@/lib/auth";
import { getConsultants } from "@/lib/leads/data";
import {
  getClient,
  getClientHasPortalAccess,
  getClientRelations,
  getDistinctClientValues,
  getIdentityDocuments,
} from "@/lib/clients/data";
import { getAllCaseStages, getCasesByClient, getServiceTypes } from "@/lib/cases/data";
import { getDocumentsByClient } from "@/lib/documents/data";
import { getClientTimeline } from "@/lib/timeline/data";
import { updateClientRecord } from "../actions";
import { ClientCasesPanel } from "../_components/client-cases-panel";
import { ClientFilesPanel } from "../_components/client-files-panel";
import { ClientForm } from "../_components/client-form";
import { ClientSummary } from "../_components/client-summary";
import { ClientTabs } from "../_components/client-tabs";
import { DependentsPanel } from "../_components/dependents-panel";
import { PortalAccessCard } from "../_components/portal-access-card";
import { DocumentsPanel } from "../_components/documents-panel";

type SearchParams = Record<string, string | string[] | undefined>;

const VALID_TABS = [
  "resumo",
  "dados",
  "documentos",
  "dependentes",
  "processos",
  "linha-do-tempo",
] as const;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = (VALID_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as (typeof VALID_TABS)[number])
    : "resumo";

  const client = await getClient(id);
  if (!client) notFound();

  const [
    profile,
    role,
    consultants,
    paises,
    situacoes,
    relations,
    documents,
    cases,
    serviceTypes,
    allStages,
    clientFiles,
    hasPortalAccess,
  ] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentUserRole(),
    getConsultants(),
    getDistinctClientValues("pais"),
    getDistinctClientValues("situacao"),
    getClientRelations(id),
    getIdentityDocuments(id),
    getCasesByClient(id),
    getServiceTypes(),
    getAllCaseStages(),
    getDocumentsByClient(id),
    getClientHasPortalAccess(id),
  ]);

  const stagesById = Object.fromEntries(allStages.map((s) => [s.id, s]));
  const updateWithId = updateClientRecord.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          {client.nome}
        </h1>
      </div>

      <ClientTabs clientId={id} active={tab} />

      {tab === "resumo" ? (
        <div className="space-y-6">
          <ClientSummary client={client} relations={relations} documents={documents} />
          <PortalAccessCard
            clientId={id}
            hasEmail={Boolean(client.email)}
            hasAccess={hasPortalAccess}
            canInvite={role === "admin" || role === "director"}
          />
        </div>
      ) : null}

      {tab === "dados" ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <ClientForm
            action={updateWithId}
            client={client}
            consultants={consultants}
            canAssignConsultant={consultants.length > 0}
            currentUserNome={profile?.nome ?? ""}
            distinctPaises={paises}
            distinctSituacoes={situacoes}
          />
        </div>
      ) : null}

      {tab === "documentos" ? (
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
              Arquivos do cliente
            </h2>
            <ClientFilesPanel clientId={id} documents={clientFiles} />
          </div>
          <div>
            <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
              Documentos de identidade
            </h2>
            <DocumentsPanel clientId={id} documents={documents} />
          </div>
        </div>
      ) : null}

      {tab === "dependentes" ? (
        <DependentsPanel clientId={id} relations={relations} />
      ) : null}

      {tab === "processos" ? (
        <ClientCasesPanel
          clientId={id}
          cases={cases}
          serviceTypes={serviceTypes}
          stagesById={stagesById}
        />
      ) : null}

      {tab === "linha-do-tempo" ? <ClientTimeline clientId={id} leadId={client.lead_id} /> : null}
    </div>
  );
}

async function ClientTimeline({
  clientId,
  leadId,
}: {
  clientId: string;
  leadId: string | null;
}) {
  const entries = await getClientTimeline(clientId, leadId);

  if (entries.length === 0) {
    return (
      <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <ol className="space-y-4">
        {entries.map((entry, index) => (
          <li key={index} className="border-l-2 border-kmp-orange/30 pl-4">
            <p className="text-xs uppercase tracking-wide text-kmp-graphite/50">
              {entry.categoria} ·{" "}
              {new Date(entry.quando).toLocaleString("pt-BR")}
            </p>
            <p className="mt-0.5 text-sm text-kmp-graphite">{entry.descricao}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
