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
import {
  getAllCaseStages,
  getCasesByClient,
  getCaseStatusLabels,
  getServiceTypes,
  getTeamMembersStaff,
} from "@/lib/cases/data";
import { getPerfilDoCliente } from "@/lib/clients/perfil";
import { indicadoresDoCliente } from "@/lib/clients/perfil-calc";
import { dayKeySydney } from "@/lib/appointments/timezones";
import { getDocumentsByClient } from "@/lib/documents/data";
import { getClientTimeline } from "@/lib/timeline/data";
import { updateClientRecord } from "../actions";
import { ClientCasesPanel } from "../_components/client-cases-panel";
import { ClientFilesPanel } from "../_components/client-files-panel";
import { getDocumentCategories } from "@/lib/documents/data";
import { getStorageSettings } from "@/lib/storage-admin/validation";

async function regrasDeEnvio() {
  const s = await getStorageSettings();
  return { extensoes: s.allowed_extensions, maxBytes: s.max_file_size_bytes };
}
import { ClientForm } from "../_components/client-form";
import { ClientSummary } from "../_components/client-summary";
import { ClientHero } from "../_components/client-hero";
import { ClientProcessCards, ClientTasks } from "../_components/client-overview";
import { DependentsPanel } from "../_components/dependents-panel";
import { PortalAccessCard } from "../_components/portal-access-card";
import { DocumentsPanel } from "../_components/documents-panel";
import { SendEmailPanel } from "../_components/send-email-panel";

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
    statusLabels,
    staff,
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
    getCaseStatusLabels(),
    getTeamMembersStaff(),
  ]);

  const stagesById = Object.fromEntries(allStages.map((s) => [s.id, s]));
  const serviceNameById = Object.fromEntries(serviceTypes.map((st) => [st.id, st.nome]));
  const staffNameById = Object.fromEntries(staff.map((m) => [m.user_id, m.nome]));
  const perfil = await getPerfilDoCliente(id, cases);
  const indicadores = indicadoresDoCliente(
    cases.map((c) => ({
      status: c.status,
      checklistPct: perfil.processos[c.id]?.checklistPct ?? null,
      formularioPct: perfil.processos[c.id]?.formularioPct ?? null,
      pendentesCliente: perfil.processos[c.id]?.pendentesCliente ?? 0,
      prazo: c.prazo,
    })),
  );
  const hoje = dayKeySydney(new Date().toISOString());
  const updateWithId = updateClientRecord.bind(null, id);

  return (
    <div className="space-y-6">
      <ClientHero
        client={client}
        consultoraNome={
          consultants.find((c) => c.user_id === client.consultor_id)?.nome ??
          staffNameById[client.consultor_id] ??
          null
        }
        indicadores={indicadores}
        abaAtiva={tab}
        hoje={hoje}
      />

      {tab === "resumo" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ClientProcessCards
              cases={cases}
              processos={perfil.processos}
              serviceNameById={serviceNameById}
              stagesById={stagesById}
              statusLabels={statusLabels}
              hoje={hoje}
            />
            <ClientTasks clientId={id} tarefas={perfil.tarefas} staffNameById={staffNameById} hoje={hoje} />
          </div>
          <div className="space-y-6">
            <ClientSummary client={client} relations={relations} documents={documents} />
            <PortalAccessCard
              clientId={id}
              hasEmail={Boolean(client.email)}
              hasAccess={hasPortalAccess}
              canInvite={role === "admin" || role === "director"}
            />
            {client.email ? <SendEmailPanel clientEmail={client.email} /> : null}
          </div>
        </div>
      ) : null}

      {tab === "dados" ? (
        <div className="rounded-lg bg-kmp-surface p-6 shadow-sm">
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
        <div className="space-y-6">
          <ClientFilesPanel
            clientId={id}
            documents={clientFiles}
            isAdmin={role === "admin"}
            processos={cases.map((c) => ({
              id: c.id,
              nome: serviceTypes.find((st) => st.id === c.service_type_id)?.nome ?? "Processo",
            }))}
            categories={await getDocumentCategories()}
            regras={await regrasDeEnvio()}
          />
          <DocumentsPanel clientId={id} documents={documents} />
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
          allStages={allStages}
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
      <p className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-8 text-center text-sm text-kmp-text/50 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-6 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
      <ol className="space-y-4">
        {entries.map((entry, index) => (
          <li key={index} className="border-l-2 border-kmp-orange/30 pl-4">
            <p className="text-xs uppercase tracking-wide text-kmp-text/40">
              {entry.categoria} ·{" "}
              {new Date(entry.quando).toLocaleString("pt-BR")}
            </p>
            <p className="mt-0.5 text-sm text-kmp-text/90">{entry.descricao}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
