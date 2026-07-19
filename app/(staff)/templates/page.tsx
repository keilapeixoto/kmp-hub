import { getCurrentUserRole } from "@/lib/auth";
import { CANAL_LABELS, getMessageTemplates } from "@/lib/message-templates/data";
import { createMessageTemplate, deleteMessageTemplate } from "./actions";
import { CopyTemplateButton } from "./_components/copy-template-button";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export default async function TemplatesPage() {
  const [role, templates] = await Promise.all([
    getCurrentUserRole(),
    getMessageTemplates(),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Templates de mensagem
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/60">
          Nesta fase o envio é manual: copie o texto e cole no e-mail ou
          WhatsApp, substituindo as variáveis {"{{assim}}"}.
        </p>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
          Nenhum template cadastrado ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((template) => {
            const deleteWithId = deleteMessageTemplate.bind(null, template.id);
            return (
              <div key={template.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-medium text-kmp-graphite">
                      {template.nome}
                    </h2>
                    <p className="text-xs text-kmp-graphite/50">
                      {CANAL_LABELS[template.canal] ?? template.canal} ·{" "}
                      {template.idioma === "en" ? "English" : "Português"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyTemplateButton corpo={template.corpo} />
                    {isAdmin ? (
                      <form action={deleteWithId}>
                        <button
                          type="submit"
                          className="text-xs text-kmp-graphite/50 transition hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-md bg-black/5 p-3 text-xs text-kmp-graphite/80">
                  {template.corpo}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin ? (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Novo template
          </h2>
          <form
            action={createMessageTemplate}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Nome
              </label>
              <input name="nome" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Canal
              </label>
              <select name="canal" defaultValue="email" className={inputClass}>
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-kmp-graphite">
                Idioma
              </label>
              <select name="idioma" defaultValue="pt" className={inputClass}>
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-kmp-graphite">
                Corpo (use {"{{nome_cliente}}"}, {"{{consultor}}"} etc.)
              </label>
              <textarea name="corpo" rows={5} required className={inputClass} />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Criar template
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
