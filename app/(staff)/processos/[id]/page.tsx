import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserProfile, getCurrentUserRole } from "@/lib/auth";
import { getConsultants } from "@/lib/leads/data";
import { getClients, getClient } from "@/lib/clients/data";
import {
  getAllCaseStages,
  getCase,
  getCaseStatusHistory,
  getServiceType,
  getServiceTypes,
  getTeamMembers,
} from "@/lib/cases/data";
import type { CaseStage } from "@/lib/cases/types";
import {
  getChecklistByCase,
  getChecklistItems,
} from "@/lib/checklists/data";
import { getDocumentsByCase } from "@/lib/documents/data";
import type { Document } from "@/lib/documents/types";
import {
  getCaseForm,
  getCaseFormFields,
  getCaseFormResponses,
  getCaseFormSteps,
  getCaseFormTemplateForCase,
  getCaseFormView,
} from "@/lib/case-forms/data";
import { updateCase } from "../actions";
import { ChecklistPanel } from "../_components/checklist-panel";
import { CaseForm } from "../_components/case-form";
import { CaseFormPanel, type StepWithFields } from "../_components/case-form-panel";
import { CaseHistory } from "../_components/case-history";
import { DeleteCaseButton } from "../_components/delete-case-button";
import { ArchiveCaseButton } from "../_components/archive-case-button";

function groupStages(stages: CaseStage[]): Record<string, CaseStage[]> {
  return stages.reduce<Record<string, CaseStage[]>>((acc, stage) => {
    (acc[stage.service_type_id] ??= []).push(stage);
    return acc;
  }, {});
}

function groupDocumentsByItem(documents: Document[]): Record<string, Document[]> {
  return documents.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!doc.checklist_item_id) return acc;
    (acc[doc.checklist_item_id] ??= []).push(doc);
    return acc;
  }, {});
}

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const caseItem = await getCase(id);
  if (!caseItem) notFound();

  const role = await getCurrentUserRole();
  const isStaffRole = role === "admin" || role === "director";

  const [
    profile,
    consultants,
    clients,
    serviceTypes,
    allStages,
    teamMembers,
    history,
    client,
    serviceType,
    checklist,
    documents,
  ] = await Promise.all([
    getCurrentUserProfile(),
    getConsultants(),
    getClients({}),
    getServiceTypes(),
    getAllCaseStages(),
    getTeamMembers(),
    getCaseStatusHistory(id),
    getClient(caseItem.client_id),
    getServiceType(caseItem.service_type_id),
    getChecklistByCase(id),
    getDocumentsByCase(id),
  ]);

  const checklistItems = checklist ? await getChecklistItems(checklist.id) : [];

  const dataFormTemplate = await getCaseFormTemplateForCase(id);
  let dataFormSteps: StepWithFields[] = [];
  let dataForm = null;
  let dataFormResponses: Record<string, string> = {};
  if (dataFormTemplate) {
    const steps = await getCaseFormSteps(dataFormTemplate.id);
    dataFormSteps = await Promise.all(
      steps.map(async (step) => ({
        ...step,
        fields: await getCaseFormFields(step.id),
      })),
    );
    dataForm = await getCaseForm(id, dataFormTemplate.id);
    dataFormResponses = dataForm ? await getCaseFormResponses(dataForm.id) : {};
  }
  const dataFormView = dataFormTemplate
    ? await getCaseFormView(id, dataFormTemplate.id)
    : null;

  const updateWithId = updateCase.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/processos"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            ← Processos
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {client?.nome ?? "Cliente"}
          </h1>
        </div>
        {isStaffRole ? (
          <div className="flex items-center gap-4">
            {caseItem.status !== "arquivado" ? (
              <ArchiveCaseButton caseId={caseItem.id} />
            ) : null}
            <DeleteCaseButton caseId={caseItem.id} />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          <CaseForm
            action={updateWithId}
            caseItem={caseItem}
            clients={clients}
            serviceTypes={serviceTypes}
            stagesByServiceType={groupStages(allStages)}
            consultants={consultants}
            teamMembers={teamMembers}
            canAssignConsultant={consultants.length > 0}
            currentUserNome={profile?.nome ?? ""}
          />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Histórico de status e etapa
          </h2>
          <div className="mt-4">
            <CaseHistory events={history} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
          Checklist
        </h2>
        <ChecklistPanel
          caseId={id}
          clientId={caseItem.client_id}
          serviceTypeChecklistTemplateId={serviceType?.checklist_template_id ?? null}
          checklist={checklist}
          items={checklistItems}
          documentsByItem={groupDocumentsByItem(documents)}
        />
      </div>

      {dataFormTemplate ? (
        <div>
          <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
            Formulário de Dados
          </h2>
          <CaseFormPanel
            templateNome={dataFormTemplate.nome}
            steps={dataFormSteps}
            caseForm={dataForm}
            responses={dataFormResponses}
            formView={dataFormView}
            caseId={id}
            clientNome={client?.nome ?? ""}
            clientEmail={client?.email ?? null}
            clientTelefone={client?.telefone ?? null}
          />
        </div>
      ) : null}
    </div>
  );
}
