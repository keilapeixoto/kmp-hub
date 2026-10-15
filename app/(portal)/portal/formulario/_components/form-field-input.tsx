import type { CaseFormField } from "@/lib/case-forms/types";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-kmp-text/15 bg-white/85 px-3.5 py-2.5 text-sm text-kmp-text outline-none transition focus:border-kmp-orange focus:ring-2 focus:ring-kmp-orange/20 disabled:opacity-70";

export function FormFieldInput({
  field,
  defaultValue,
}: {
  field: CaseFormField;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-kmp-text">
        {field.label}
        {field.obrigatorio ? <span className="text-kmp-orange"> *</span> : null}
      </label>
      {field.ajuda ? (
        <p className="mt-0.5 text-xs text-kmp-text/60">{field.ajuda}</p>
      ) : null}

      {field.tipo === "textarea" ? (
        <textarea
          name={field.id}
          defaultValue={defaultValue}
          rows={4}
          className={inputClass}
        />
      ) : field.tipo === "select" ? (
        <select
          name={field.id}
          defaultValue={defaultValue}
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
        <div className="mt-2 flex flex-wrap gap-2">
          {(field.opcoes ?? []).map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-kmp-text/15 bg-white/85 px-4 py-2 text-sm text-kmp-text has-[:checked]:border-kmp-primary has-[:checked]:bg-kmp-primary has-[:checked]:text-kmp-on-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-kmp-orange/40"
            >
              <input
                type="radio"
                name={field.id}
                value={opt}
                defaultChecked={defaultValue === opt}
                className="sr-only"
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
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          name={field.id}
          defaultValue={defaultValue}
          className={inputClass}
        />
      )}
    </div>
  );
}
