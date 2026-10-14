import { FormFieldInput } from "@/app/(portal)/portal/formulario/_components/form-field-input";
import { saveCaseFormByStaff } from "../case-form-edit-actions";
import type { StepWithFields } from "./case-form-panel";

export function CaseFormEdit({
  caseId,
  templateId,
  steps,
  responses,
  aviso,
}: {
  caseId: string;
  templateId: string;
  steps: StepWithFields[];
  responses: Record<string, string>;
  aviso: { ok: boolean; texto: string } | null;
}) {
  const fields = steps.flatMap((s) => s.fields);
  const action = saveCaseFormByStaff.bind(null, caseId, templateId, fields);

  return (
    <details className="mt-4 border-t border-kmp-divider pt-4" open={aviso !== null}>
      <summary className="cursor-pointer text-xs font-medium text-kmp-text/70">
        Editar respostas
      </summary>
      {aviso ? (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            aviso.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {aviso.texto}
        </p>
      ) : null}
      <form action={action} className="mt-3 space-y-6">
        {steps.map((step) => (
          <fieldset key={step.id} className="space-y-4">
            <legend className="text-sm font-semibold text-kmp-text">{step.titulo}</legend>
            {step.fields.map((f) => (
              <FormFieldInput key={f.id} field={f} defaultValue={responses[f.id] ?? ""} />
            ))}
          </fieldset>
        ))}
        <button
          type="submit"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white"
        >
          Salvar respostas
        </button>
      </form>
    </details>
  );
}
