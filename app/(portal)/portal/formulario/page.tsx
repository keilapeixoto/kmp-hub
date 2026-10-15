import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getCaseFormTemplateForCase,
  getCaseFormSteps,
  getCaseFormFields,
  getCaseForm,
  getCaseFormResponses,
  getEtapasComCampos,
  markCaseFormViewed,
} from "@/lib/case-forms/data";
import { camposPendentes } from "@/lib/case-forms/validate";
import { getPortalCase } from "@/lib/portal/data";
import { PortalHeader } from "../_components/portal-header";
import { FormFieldInput } from "./_components/form-field-input";
import { SubmitButton } from "./_components/submit-button";
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
  const pendentes =
    sp.pendentes !== undefined ? camposPendentes(await getEtapasComCampos(template.id), responses) : [];

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
  const erro = sp.erro !== undefined;
  const somenteLeitura = caseForm ? !["em_preenchimento", "enviado"].includes(caseForm.status) : false;
  const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm sm:p-6";

  return (
    <>
      <PortalHeader />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/70 hover:text-kmp-text">
            <ArrowLeft className="h-4 w-4" /> Meu processo
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-kmp-text sm:text-3xl">{template.nome}</h1>
          <p className="mt-1 text-sm text-kmp-text/70">
            Suas respostas são salvas a cada etapa: você pode parar e continuar depois.
          </p>
        </div>

        {enviado && caseForm?.status === "enviado" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-[#dcf3e7] p-4 text-sm font-medium text-[#16673f]">
            <Check className="h-4 w-4" /> Formulário enviado. A equipe da KMP Consulting vai revisar as informações.
          </p>
        ) : null}

        {erro ? (
          <p className="rounded-2xl bg-[#fde2e5] p-4 text-sm font-medium text-[#9a2433]">
            Não conseguimos salvar esta etapa. Confira sua conexão e tente de novo; se continuar, fale com sua
            consultora.
          </p>
        ) : null}

        {somenteLeitura ? (
          <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/75">
            A equipe já está analisando este formulário, então as respostas não podem mais ser alteradas por aqui.
            Precisa corrigir algo? Fale com sua consultora.
          </p>
        ) : null}

        <div className={cartao}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-heading text-lg font-semibold text-kmp-text">{currentStep.titulo}</p>
            <p className="shrink-0 text-sm font-semibold text-kmp-text/60">
              Etapa {currentStepNumber} de {steps.length}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s.id}
                title={s.titulo}
                className={`h-2 flex-1 rounded-full ${
                  i + 1 < currentStepNumber ? "bg-kmp-processos" : i + 1 === currentStepNumber ? "bg-kmp-orange" : "bg-kmp-text/10"
                }`}
              />
            ))}
          </div>
        </div>

        {pendentes.length > 0 ? (
          <div className="rounded-2xl bg-[#fcf1cf] p-4 text-sm text-[#7a5806]">
            <p className="font-semibold">Faltam {pendentes.length} campo(s) obrigatório(s) para enviar:</p>
            <ul className="mt-2 space-y-1">
              {pendentes.map((p) => (
                <li key={p.fieldId}>
                  <Link href={`/portal/formulario?processo=${caseId}&etapa=${p.etapa}`} className="underline">
                    Etapa {p.etapa}: {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className={`${cartao} space-y-5`}>
          <fieldset disabled={somenteLeitura} className="space-y-5">
            {fields.map((field) => (
              <FormFieldInput key={field.id} field={field} defaultValue={responses[field.id] ?? ""} />
            ))}
          </fieldset>

          <div className="flex items-center justify-between gap-3 border-t border-kmp-divider pt-5">
            {currentStepNumber > 1 ? (
              <SubmitButton
                formAction={prevAction}
                formNoValidate
                className="rounded-full bg-kmp-text/5 px-5 py-2.5 text-sm font-semibold text-kmp-text transition hover:bg-kmp-text/10"
              >
                Anterior
              </SubmitButton>
            ) : (
              <span />
            )}

            <SubmitButton
              formAction={isLastStep ? submitAction : nextAction}
              formNoValidate
              className="rounded-full bg-kmp-primary px-6 py-2.5 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90"
            >
              {isLastStep ? (somenteLeitura ? "Concluir" : "Enviar formulário") : "Próximo"}
            </SubmitButton>
          </div>
        </form>
      </main>
    </>
  );
}
