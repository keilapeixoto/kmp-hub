import type { CaseForm, CaseFormStep, CaseFormField } from "@/lib/case-forms/types";
import { CASE_FORM_STATUS_LABELS } from "@/lib/case-forms/types";

export type StepWithFields = CaseFormStep & { fields: CaseFormField[] };

export function CaseFormPanel({
  templateNome,
  steps,
  caseForm,
  responses,
}: {
  templateNome: string;
  steps: StepWithFields[];
  caseForm: CaseForm | null;
  responses: Record<string, string>;
}) {
  const answeredCount = Object.keys(responses).length;
  const totalFields = steps.reduce((n, s) => n + s.fields.length, 0);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-kmp-graphite">{templateNome}</h2>
        {caseForm ? (
          <span className="rounded-full bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite/70">
            {CASE_FORM_STATUS_LABELS[caseForm.status]}
          </span>
        ) : null}
      </div>

      {!caseForm ? (
        <p className="mt-4 text-sm text-kmp-graphite/60">
          Aguardando o cliente iniciar o preenchimento no portal.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-kmp-graphite/60">
            {answeredCount} de {totalFields} campos preenchidos.
          </p>
          <div className="mt-4 space-y-6">
            {steps.map((step) => (
              <div key={step.id}>
                <h3 className="text-sm font-semibold text-kmp-graphite">
                  {step.titulo}
                </h3>
                <dl className="mt-2 divide-y divide-black/5 rounded-md border border-black/5">
                  {step.fields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                      <dt className="text-xs font-medium text-kmp-graphite/60 sm:w-1/3 sm:shrink-0">
                        {field.label}
                      </dt>
                      <dd className="whitespace-pre-wrap text-sm text-kmp-graphite">
                        {responses[field.id] ?? (
                          <span className="text-kmp-graphite/30">—</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
