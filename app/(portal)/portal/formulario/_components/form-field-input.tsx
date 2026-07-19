import type { CaseFormField } from "@/lib/case-forms/types";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm";

export function FormFieldInput({
  field,
  defaultValue,
}: {
  field: CaseFormField;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-kmp-graphite">
        {field.label}
        {field.obrigatorio ? <span className="text-kmp-orange"> *</span> : null}
      </label>
      {field.ajuda ? (
        <p className="mt-0.5 text-xs text-kmp-graphite/50">{field.ajuda}</p>
      ) : null}

      {field.tipo === "textarea" ? (
        <textarea
          name={field.id}
          defaultValue={defaultValue}
          required={field.obrigatorio}
          rows={4}
          className={inputClass}
        />
      ) : field.tipo === "select" ? (
        <select
          name={field.id}
          defaultValue={defaultValue}
          required={field.obrigatorio}
          className={inputClass}
        >
          <option value="" disabled>
            Selecione
          </option>
          {(field.opcoes ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.tipo === "radio" ? (
        <div className="mt-2 flex flex-wrap gap-4">
          {(field.opcoes ?? []).map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm text-kmp-graphite"
            >
              <input
                type="radio"
                name={field.id}
                value={opt}
                defaultChecked={defaultValue === opt}
                required={field.obrigatorio}
              />
              {opt}
            </label>
          ))}
        </div>
      ) : field.tipo === "date" ? (
        <input
          type="date"
          name={field.id}
          defaultValue={defaultValue}
          required={field.obrigatorio}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          name={field.id}
          defaultValue={defaultValue}
          required={field.obrigatorio}
          className={inputClass}
        />
      )}
    </div>
  );
}
