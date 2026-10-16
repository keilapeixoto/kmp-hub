"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { Mail, Paperclip } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import { preencherVariaveis, type VariaveisDoEmail } from "@/lib/email/variaveis";
import type { TemplateDeEmail } from "@/lib/email/dados";
import { enviarEmailAoCliente, type SendEmailState } from "../actions";

// Enviar e-mail ao cliente pelo Gmail de quem está logado: template (com as
// variáveis já preenchidas), anexos do template e documentos do cliente, e a
// assinatura da pessoa no fim.

const inicial: SendEmailState = { error: null, sent: false };

const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

function tamanho(bytes: number): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ClientEmailComposer({
  clientId,
  clientEmail,
  templates,
  serviceTypeIds,
  variaveis,
  documentos,
  temAssinatura,
}: {
  clientId: string;
  clientEmail: string;
  templates: TemplateDeEmail[];
  /** Tipos de serviço dos processos do cliente: templates deles aparecem primeiro. */
  serviceTypeIds: string[];
  variaveis: VariaveisDoEmail;
  documentos: { id: string; nome: string; tamanho: number }[];
  temAssinatura: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [templateId, setTemplateId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [anexosTemplate, setAnexosTemplate] = useState<string[]>([]);

  const ordenados = useMemo(() => {
    const doCliente = templates.filter((t) => t.service_type_id && serviceTypeIds.includes(t.service_type_id));
    const gerais = templates.filter((t) => !t.service_type_id);
    return { doCliente, gerais };
  }, [templates, serviceTypeIds]);
  const escolhido = templates.find((t) => t.id === templateId) ?? null;

  const [state, formAction, enviando] = useActionState(
    async (prev: SendEmailState, formData: FormData) => {
      const r = await enviarEmailAoCliente(clientId, prev, formData);
      if (r.sent) {
        formRef.current?.reset();
        setTemplateId("");
        setAssunto("");
        setCorpo("");
        setAnexosTemplate([]);
      }
      return r;
    },
    inicial,
  );

  function escolher(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setAssunto(preencherVariaveis(t.assunto ?? "", variaveis));
    setCorpo(preencherVariaveis(t.corpo, variaveis));
    setAnexosTemplate(t.anexos.map((a) => a.id));
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Enviar e-mail" cor="laranja" icon={Mail} />
      <p className="mb-3 text-xs text-kmp-text/60">
        Vai pelo seu Gmail conectado, para {clientEmail}. Aparece na sua caixa de Enviados.
      </p>

      <form ref={formRef} action={formAction} className="space-y-3">
        <div>
          <label htmlFor="email-template" className="mb-1 block text-xs font-semibold text-kmp-text/70">
            Template
          </label>
          <select id="email-template" value={templateId} onChange={(e) => escolher(e.target.value)} className={campo}>
            <option value="">Escrever do zero</option>
            {ordenados.doCliente.length > 0 ? (
              <optgroup label="Do visto deste cliente">
                {ordenados.doCliente.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Gerais">
              {ordenados.gerais.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label htmlFor="email-assunto" className="mb-1 block text-xs font-semibold text-kmp-text/70">
            Assunto
          </label>
          <input id="email-assunto" name="subject" required value={assunto} onChange={(e) => setAssunto(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="email-corpo" className="mb-1 block text-xs font-semibold text-kmp-text/70">
            Mensagem
          </label>
          <textarea
            id="email-corpo"
            name="body"
            required
            rows={8}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            className={campo}
          />
        </div>

        {(escolhido?.anexos.length ?? 0) > 0 || documentos.length > 0 ? (
          <fieldset className="rounded-2xl bg-kmp-text/5 p-3">
            <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold text-kmp-text/70">
              <Paperclip className="h-3.5 w-3.5" /> Anexos
            </legend>
            {escolhido && escolhido.anexos.length > 0 ? (
              <div className="mb-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-kmp-text/50">Do template</p>
                {escolhido.anexos.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 py-0.5 text-sm text-kmp-text">
                    <input
                      type="checkbox"
                      name="anexo_template"
                      value={a.id}
                      checked={anexosTemplate.includes(a.id)}
                      onChange={(e) =>
                        setAnexosTemplate((atual) =>
                          e.target.checked ? [...atual, a.id] : atual.filter((x) => x !== a.id),
                        )
                      }
                    />
                    <span className="truncate">{a.nome}</span>
                    <span className="text-xs text-kmp-text/50">{tamanho(a.tamanho)}</span>
                  </label>
                ))}
              </div>
            ) : null}
            {documentos.length > 0 ? (
              <details>
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-kmp-text/50">
                  Documentos do cliente ({documentos.length})
                </summary>
                <div className="mt-1 max-h-48 overflow-y-auto">
                  {documentos.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 py-0.5 text-sm text-kmp-text">
                      <input type="checkbox" name="anexo_documento" value={d.id} />
                      <span className="truncate">{d.nome}</span>
                      <span className="text-xs text-kmp-text/50">{tamanho(d.tamanho)}</span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
          </fieldset>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-kmp-text">
          <input type="checkbox" name="assinatura" defaultChecked={temAssinatura} disabled={!temAssinatura} />
          {temAssinatura ? (
            "Incluir minha assinatura"
          ) : (
            <span className="text-kmp-text/60">
              Sem assinatura cadastrada.{" "}
              <Link href="/perfil" className="font-semibold text-kmp-orange hover:underline">
                Cadastrar no Meu perfil
              </Link>
            </span>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar"}
          </button>
          {state.error ? <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span> : null}
          {state.sent ? <span className="text-sm text-green-700 dark:text-green-400">E-mail enviado.</span> : null}
        </div>
      </form>
    </section>
  );
}
