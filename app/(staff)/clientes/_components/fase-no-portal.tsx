"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addClientUpdate, updateCaseEtapa } from "@/app/(staff)/processos/actions";

// Fase do processo que o cliente acompanha na linha do tempo do portal:
// clicar numa fase muda a etapa do processo (mesma etapa do Pipeline).
export function FaseNoPortal({
  caseId,
  etapaAtual,
  etapas,
  ultimoRecado,
}: {
  caseId: string;
  ultimoRecado: { mensagem: string; created_at: string } | null;
  etapaAtual: string | null;
  etapas: { id: string; nome: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [atual, setAtual] = useOptimistic(etapaAtual);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoRecado, startRecado] = useTransition();
  const idx = etapas.findIndex((e) => e.id === atual);

  return (
    <div className="mt-3 space-y-3">
      {etapas.length > 0 ? (
      <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/60">
        Fase que o cliente vê no portal {pending ? "· salvando…" : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {etapas.map((e, i) => {
          const feita = idx >= 0 && i < idx;
          const agora = i === idx;
          return (
            <button
              key={e.id}
              type="button"
              disabled={pending || agora}
              onClick={() =>
                startTransition(async () => {
                  setAtual(e.id);
                  await updateCaseEtapa(caseId, e.id);
                })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                agora
                  ? "bg-kmp-orange text-white shadow-sm"
                  : feita
                    ? "bg-[#dcf3e7] text-[#16673f] hover:opacity-80 dark:bg-[#45c285]/20 dark:text-[#a9e6c7]"
                    : "bg-kmp-text/5 text-kmp-text/75 hover:bg-kmp-text/10"
              }`}
            >
              {i + 1}. {e.nome}
            </button>
          );
        })}
      </div>
      </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/60">Recado para o cliente</p>
        {ultimoRecado ? (
          <p className="mb-2 rounded-2xl bg-[#f27b20]/10 px-3 py-2 text-sm text-kmp-text">
            <span className="font-semibold">No portal agora:</span> {ultimoRecado.mensagem}
          </p>
        ) : null}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(ev) => {
            ev.preventDefault();
            startRecado(async () => {
              const r = await addClientUpdate(caseId, texto);
              setErro(r.error);
              if (!r.error) setTexto("");
            });
          }}
        >
          <input
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            maxLength={500}
            placeholder="Ex.: Aguardando resposta do Home Affairs"
            className="min-w-0 flex-1 rounded-full border border-kmp-text/15 bg-white/85 px-4 py-2 text-sm text-kmp-text outline-none focus:border-kmp-orange dark:bg-white/10"
          />
          <button
            type="submit"
            disabled={salvandoRecado || !texto.trim()}
            className="shrink-0 rounded-full bg-kmp-primary px-4 py-2 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90 disabled:opacity-50"
          >
            {salvandoRecado ? "Enviando…" : "Mostrar no portal"}
          </button>
        </form>
        {erro ? <p className="mt-1 text-xs text-[#b0283b]">{erro}</p> : null}
      </div>
    </div>
  );
}
