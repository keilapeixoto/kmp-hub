"use client";

import { useActionState, useState } from "react";
import type { ConsultantOption } from "@/lib/leads/types";
import { cadastrarClienteComPortal, type CadastroPortalState } from "../cadastro-portal-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-sm font-medium text-kmp-text";

type Tipo = { id: string; nome: string; temChecklist: boolean };

export function CadastroPortalForm({
  tipos,
  consultants,
  usuarioId,
  podeConvidar,
}: {
  tipos: Tipo[];
  consultants: ConsultantOption[];
  usuarioId: string;
  podeConvidar: boolean;
}) {
  const [state, formAction, pending] = useActionState<CadastroPortalState, FormData>(cadastrarClienteComPortal, {
    erro: null,
  });
  // Padrão: visto de turista, o caso mais comum de cliente novo.
  // Campos não controlados com defaultValue vindo de state.valores: depois da
  // ação o React faz form.reset(), que volta cada campo ao defaultValue. Campo
  // controlado voltaria ao valor inicial e enviaria outra coisa (ex.: convite
  // marcado de novo depois de um erro).
  const v = state.valores ?? {};
  const padrao = tipos.find((t) => /\b600\b/.test(t.nome))?.id ?? "";
  const [tipoId, setTipoId] = useState(padrao);
  const tipo = tipos.find((t) => t.id === tipoId);
  const [convidar, setConvidar] = useState(true);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nome" className={labelClass}>
            Nome completo *
          </label>
          <input key={`nome-${state.erro}`} defaultValue={v.nome ?? ""} id="nome" name="nome" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            E-mail *
          </label>
          <input key={`email-${state.erro}`} defaultValue={v.email ?? ""} id="email" name="email" type="email" required className={inputClass} />
          <p className="mt-1 text-xs text-kmp-text/60">O cliente entra no portal por este e-mail.</p>
        </div>
        <div>
          <label htmlFor="telefone" className={labelClass}>
            WhatsApp
          </label>
          <input key={`telefone-${state.erro}`} defaultValue={v.telefone ?? ""} id="telefone" name="telefone" className={inputClass} />
        </div>
        <div>
          <label htmlFor="service_type_id" className={labelClass}>
            Visto *
          </label>
          <select
            id="service_type_id"
            name="service_type_id"
            required
            defaultValue={v.service_type_id ?? padrao}
            onChange={(e) => setTipoId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Escolha
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          {tipo && !tipo.temChecklist ? (
            <p className="mt-1 text-xs text-amber-700">
              Este visto ainda não tem checklist de documentos: o processo é criado sem checklist.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="idioma_preferencial" className={labelClass}>
            Idioma do portal
          </label>
          <select key={`idioma-${state.erro}`} id="idioma_preferencial" name="idioma_preferencial" defaultValue={v.idioma_preferencial ?? "pt"} className={inputClass}>
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>
        {podeConvidar && consultants.length > 0 ? (
          <div>
            <label htmlFor="consultor_id" className={labelClass}>
              Consultora responsável
            </label>
            <select key={`consultor-${state.erro}`} id="consultor_id" name="consultor_id" defaultValue={v.consultor_id ?? usuarioId} className={inputClass}>
              {consultants.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {podeConvidar ? (
        <label className="flex items-start gap-2 text-sm text-kmp-text">
          <input
            type="checkbox"
            name="convidar"
            defaultChecked={v.convidar !== "nao"}
            onChange={(e) => setConvidar(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Enviar agora o convite do portal por e-mail
            <span className="block text-xs text-kmp-text/60">
              Desmarque se quiser conferir o cadastro antes; dá para convidar depois pelo perfil.
            </span>
          </span>
        </label>
      ) : (
        <p className="text-xs text-kmp-text/60">
          O convite do portal é enviado por admin ou diretor, pelo perfil do cliente.
        </p>
      )}

      {state.erro ? <p className="text-sm text-red-700">{state.erro}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Cadastrando…" : podeConvidar && convidar ? "Cadastrar e convidar" : "Cadastrar"}
      </button>
    </form>
  );
}
