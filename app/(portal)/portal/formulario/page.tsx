import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCaseFormTemplateForCase,
  getCaseFormSteps,
  getCaseFormFields,
  getCaseForm,
  getCaseFormResponses,
  markCaseFormViewed,
} from "@/lib/case-forms/data";
import { getPortalCase } from "@/lib/portal/data";
import { PortalHeader } from "../_components/portal-header";
import { FormFieldInput } from "./_components/form-field-input";
import { saveFormStep } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PortalFormularioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const caseId = Array.isArray(sp.processo) ? sp.processo[0] : sp.processo;
  const enviado = sp.enviado === "1";
  const etapaParam = Array.isArray(sp.etapa) ? sp.etapa[0] : sp.etapa;

  if (!caseId) notFound();

  const [portalCase, template] = await Promise.all([
    getPortalCase(caseId),
    getCaseFormTemplateForCase(caseId),
  ]);

  if (!portalCase || !template) notFound();

  await markCaseFormViewed(caseId, template.id);

  const steps = await getCaseFormSteps(template.id);
  if (steps.length === 0) notFound();

  const currentStepNumber = Math.min(
    Math.max(1, Number(etapaParam) || 1),
    steps.length,
  );
  const currentStep = steps[currentStepNumber - 1];

  const [fields, caseForm] = await Promise.all([
    getCaseFormFields(currentStep.id),
    getCaseForm(caseId, template.id),
  ]);
  const responses = caseForm ? await getCaseFormResponses(caseForm.id) : {};

  const prevAction = saveFormStep.bind(
    null,
    caseId,
    template.id,
    fields,
    currentStepNumber,
    steps.length,
    "anterior",
  );
  const nextAction = saveFormStep.bind(
    null,
    caseId,
    template.id,
    fields,
    currentStepNumber,
    steps.length,
    "proximo",
  );
  const submitAction = saveFormStep.bind(
    null,
    caseId,
    template.id,
    fields,
    currentStepNumber,
    steps.length,
    "enviar",
  );

  const isLastStep = currentStepNumber === steps.length;

  return (
    <div className="min-h-screen bg-kmp-bg">
      <PortalHeader />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <Link
            href="/portal"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            ← Seus processos
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {template.nome}
          </h1>
        </div>

        {enviado && caseForm?.status === "enviado" ? (
          <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
            Formulário enviado com sucesso. A equipe da KMP Consulting vai
            revisar as informações.
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-kmp-graphite/50">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 <= currentStepNumber ? "bg-kmp-orange" : "bg-kmp-graphite/10"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-kmp-graphite/60">
          Etapa {currentStepNumber} de {steps.length} — {currentStep.titulo}
        </p>

        <form className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
          {fields.map((field) => (
            <FormFieldInput
              key={field.id}
              field={field}
              defaultValue={responses[field.id] ?? ""}
            />
          ))}

          <div className="flex items-center justify-between border-t border-black/5 pt-4">
            {currentStepNumber > 1 ? (
              <button
                type="submit"
                formAction={prevAction}
                formNoValidate
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-kmp-graphite/70 transition hover:bg-black/[0.02]"
              >
                ← Anterior
              </button>
            ) : (
              <span />
            )}

            <button
              type="submit"
              formAction={isLastStep ? submitAction : nextAction}
              className="rounded-md bg-kmp-orange px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {isLastStep ? "Enviar formulário" : "Próximo →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
