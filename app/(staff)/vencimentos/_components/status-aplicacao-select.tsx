"use client";

import { useState, useTransition } from "react";
import { APLICACAO_STATUS } from "@/lib/aplicacoes/constants";
import { mudarStatusDaAplicacao } from "../../processos/actions";

// Troca rápida do status da aplicação direto no cartão do quadro.
export function StatusAplicacaoSelect({ caseId, status }: { caseId: string; status: string }) {
  const [valor, setValor] = useState(status);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col">
      <select
        aria-label="Status da aplicação"
        value={valor}
        disabled={salvando}
        onChange={(e) => {
          const novo = e.target.value;
          const anterior = valor;
          setValor(novo);
          setErro(null);
          startTransition(async () => {
            const r = await mudarStatusDaAplicacao(caseId, novo);
            if (r.error) {
              setValor(anterior);
              setErro(r.error);
            }
          });
        }}
        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-kmp-graphite focus:outline-none focus:ring-2 focus:ring-kmp-orange disabled:opacity-60"
      >
        {APLICACAO_STATUS.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.label}
          </option>
        ))}
      </select>
      {erro ? <span className="mt-0.5 text-[11px] text-red-600">{erro}</span> : null}
    </span>
  );
}
