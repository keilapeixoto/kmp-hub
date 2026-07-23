import type { CaseForm, CaseFormStep, CaseFormField, CaseFormView } from "@/lib/case-forms/types";
import { CASE_FORM_STATUS_LABELS } from "@/lib/case-forms/types";
import { ShareFormLinks } from "./share-form-links";

export type StepWithFields = CaseFormStep & { fields: CaseFormField[] };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function CaseFormPanel({
  templateNome,
  steps,
  caseForm,
  responses,
  formView,
  caseId,
  clientNome,
  clientEmail,
  clientTelefone,
}: {
  templateNome: string;
  steps: StepWithFields[];
  caseForm: CaseForm | null;
  responses: Record<string, string>;
  formView: CaseFormView | null;
  caseId: string;
  clientNome: string;
  clientEmail: string | null;
  clientTelefone: string | null;
}) {
  const answeredCount = Object.keys(responses).length;
  const totalFields = steps.reduce((n, s) => n + s.fields.length, 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = `${siteUrl}/portal/formulario?processo=${caseId}`;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-kmp-graphite">{templateNome}</h2>
        {caseForm ? (
          <span className="rounded-full bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite/70">
            {CASE_FORM_STATUS_LABELS[caseForm.status]}
          </span>
        ) : formView ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Abriu, ainda não preencheu
          </span>
        ) : (
          <span className="rounded-full bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite/50">
            Ainda não abriu
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-kmp-graphite/50">
        {formView ? (
          <p>Abriu em {formatDateTime(formView.visualizado_em)}.</p>
        ) : null}
        {caseForm ? (
          <p>Iniciou o preenchimento em {formatDateTime(caseForm.created_at)}.</p>
        ) : null}
        {caseForm?.enviado_em ? (
          <p>Concluiu (enviou) em {formatDateTime(caseForm.enviado_em)}.</p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-black/5 pt-4">
        <p className="mb-2 text-xs font-medium text-kmp-graphite/60">
          Enviar o link do formulário para o cliente
        </p>
        <ShareFormLinks
          link={link}
          clientNome={clientNome}
          clientEmail={clientEmail}
          clientTelefone={clientTelefone}
        />
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
