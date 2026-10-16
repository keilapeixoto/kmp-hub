"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import { APLICACAO_STATUS, SKILLS_STATUS } from "@/lib/aplicacoes/constants";
import { salvarAndamento, type AndamentoState } from "../actions";

// Andamento da aplicação no Department e do skills assessment do processo.
// Aparece também no quadro Vencimentos → Aplicações.

const inicial: AndamentoState = { error: null, ok: false };
const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const rotulo = "mb-1 block text-xs font-semibold text-kmp-text/70";

export function AndamentoCard({
  caseId,
  valores,
}: {
  caseId: string;
  valores: {
    aplicacao_status: string;
    aplicacao_enviada_em: string | null;
    aplicacao_decidida_em: string | null;
    skills_status: string;
    skills_orgao: string | null;
    skills_aplicado_em: string | null;
  };
}) {
  const [state, formAction, salvando] = useActionState(salvarAndamento.bind(null, caseId), inicial);
  const d = (v: string | null) => (v ? v.slice(0, 10) : "");
  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Andamento da aplicação" cor="azul" icon={Send} />
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="aplicacao_status" className={rotulo}>Situação no Department</label>
            <select id="aplicacao_status" name="aplicacao_status" defaultValue={valores.aplicacao_status} className={campo}>
              {APLICACAO_STATUS.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="aplicacao_enviada_em" className={rotulo}>Enviada em</label>
            <input id="aplicacao_enviada_em" name="aplicacao_enviada_em" type="date" defaultValue={d(valores.aplicacao_enviada_em)} className={campo} />
          </div>
          <div>
            <label htmlFor="aplicacao_decidida_em" className={rotulo}>Decidida em</label>
            <input id="aplicacao_decidida_em" name="aplicacao_decidida_em" type="date" defaultValue={d(valores.aplicacao_decidida_em)} className={campo} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="skills_status" className={rotulo}>Skills assessment</label>
            <select id="skills_status" name="skills_status" defaultValue={valores.skills_status} className={campo}>
              {SKILLS_STATUS.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="skills_orgao" className={rotulo}>Órgão avaliador</label>
            <input id="skills_orgao" name="skills_orgao" defaultValue={valores.skills_orgao ?? ""} placeholder="VETASSESS, ACS, Engineers Australia…" className={campo} />
          </div>
          <div>
            <label htmlFor="skills_aplicado_em" className={rotulo}>Aplicado em</label>
            <input id="skills_aplicado_em" name="skills_aplicado_em" type="date" defaultValue={d(valores.skills_aplicado_em)} className={campo} />
          </div>
        </div>
        <p className="text-xs text-kmp-text/60">
          Pedido de informação com prazo (RFI, exame médico): cadastre em Vencimentos → Prazos de 28 dias, que manda
          os lembretes.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar andamento"}
          </button>
          {state.error ? <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span> : null}
          {state.ok ? <span className="text-sm text-green-700 dark:text-green-400">Andamento salvo.</span> : null}
        </div>
      </form>
    </section>
  );
}
