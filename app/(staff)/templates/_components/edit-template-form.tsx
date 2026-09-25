"use client";

import { useRef, useState, useTransition } from "react";
import { CANAL_LABELS, type MessageTemplate } from "@/lib/message-templates/constants";
import { updateMessageTemplate } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

/**
 * Card de template com edição inline — existe pra Keila poder ajustar
 * assunto/corpo dos e-mails pelo Hub, sem precisar editar arquivo de código
 * (isso já quebrou o build duas vezes).
 */
export function EditTemplateForm({ template }: { template: MessageTemplate }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isSystemTemplate = template.chave !== null;

  if (!editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-kmp-graphite">{template.nome}</h2>
            <p className="text-xs text-kmp-graphite/50">
              {CANAL_LABELS[template.canal] ?? template.canal} ·{" "}
              {template.idioma === "en" ? "English" : "Português"}
              {isSystemTemplate ? " · usado automaticamente pelo sistema" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
          >
            Editar
          </button>
        </div>
        {template.assunto ? (
          <p className="mt-3 text-xs text-kmp-graphite/60">
            Assunto: <span className="font-medium">{template.assunto}</span>
          </p>
        ) : null}
        <p className="mt-1 whitespace-pre-wrap rounded-md bg-black/5 p-3 text-xs text-kmp-graphite/80">
          {template.corpo}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await updateMessageTemplate(template.id, formData);
          setEditing(false);
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-kmp-graphite">Nome</label>
          <input name="nome" defaultValue={template.nome} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-kmp-graphite">Canal</label>
          <select name="canal" defaultValue={template.canal} className={inputClass}>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-kmp-graphite">Idioma</label>
          <select name="idioma" defaultValue={template.idioma} className={inputClass}>
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-kmp-graphite">
          Assunto (só usado em e-mail)
        </label>
        <input name="assunto" defaultValue={template.assunto ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-kmp-graphite">
          Corpo (use {"{{nome_estudante}}"}, {"{{tipo_documento}}"}, {"{{data_limite}}"},{" "}
          {"{{dias_restantes}}"} ou as variáveis do seu template)
        </label>
        <textarea
          name="corpo"
          defaultValue={template.corpo}
          rows={8}
          required
          className={inputClass}
        />
      </div>
      {isSystemTemplate ? (
        <p className="text-xs text-amber-700">
          Este template é enviado automaticamente pelo sistema — o texto muda, mas ele não pode
          ser renomeado a ponto de perder o vínculo (o campo &quot;chave&quot; interno continua o
          mesmo).
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-kmp-orange px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="rounded-md bg-kmp-graphite/10 px-3 py-1.5 text-xs font-medium text-kmp-graphite transition hover:bg-black/10"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
