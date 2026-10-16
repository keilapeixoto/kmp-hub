"use client";

import { useState, useTransition } from "react";
import { atualizarResponsavelDoCliente, criarProcessoRapido } from "../actions";
import { updateCaseEtapa, updateCaseStatusDrag } from "../../processos/actions";

// Controles da lista de clientes: etapa e situação do processo, abrir processo
// para quem não tem, e trocar o responsável — sem abrir o perfil.

const selectClass =
  "w-full min-w-0 truncate rounded-full border border-kmp-divider bg-transparent px-2.5 py-1 text-xs text-kmp-text hover:border-kmp-text/30 focus:border-kmp-orange focus:outline-none disabled:opacity-60";

type Opcao = { id: string; nome: string };

export function ProcessoNaLista({
  clientId,
  processo,
  etapas,
  servicos,
  statusLabels,
  vistoAplicado,
}: {
  clientId: string;
  /** Visto da pasta da KEY MIGRATION (ou digitado), quando ainda não há processo. */
  vistoAplicado?: string | null;
  processo: { caseId: string; servico: string; status: string; etapaId: string | null; total: number } | null;
  etapas: Opcao[];
  servicos: Opcao[];
  statusLabels: Record<string, string>;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!processo) {
    return (
      <div className="min-w-0 space-y-1">
        {vistoAplicado ? (
          <p className="truncate text-sm font-medium text-kmp-text" title="Visto aplicado (pasta da KEY MIGRATION ou cadastro)">
            {vistoAplicado}
          </p>
        ) : null}
        <select
          aria-label="Abrir processo"
          defaultValue=""
          disabled={pendente}
          className={selectClass}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            iniciar(async () => {
              const r = await criarProcessoRapido(clientId, id);
              setErro(r.error);
            });
          }}
        >
          <option value="">{pendente ? "Criando…" : "+ Abrir processo"}</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        {erro ? <p className="mt-1 text-xs text-red-700">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate text-sm font-medium text-kmp-text">
        {processo.servico}
        {processo.total > 1 ? <span className="ml-1 text-xs font-normal text-kmp-text/60">+{processo.total - 1}</span> : null}
      </p>
      <div className="flex gap-1.5">
        <select
          aria-label="Etapa do processo"
          defaultValue={processo.etapaId ?? ""}
          disabled={pendente || etapas.length === 0}
          className={selectClass}
          onChange={(e) => iniciar(() => updateCaseEtapa(processo.caseId, e.target.value))}
        >
          {!processo.etapaId ? <option value="">Sem etapa</option> : null}
          {etapas.map((et) => (
            <option key={et.id} value={et.id}>
              {et.nome}
            </option>
          ))}
        </select>
        <select
          aria-label="Situação do processo"
          defaultValue={processo.status}
          disabled={pendente}
          className={`${selectClass} max-w-[7.5rem]`}
          onChange={(e) => iniciar(() => updateCaseStatusDrag(processo.caseId, e.target.value))}
        >
          {Object.entries(statusLabels).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ResponsavelNaLista({
  clientId,
  atual,
  equipe,
  podeEditar,
}: {
  clientId: string;
  atual: string;
  equipe: Opcao[];
  podeEditar: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const nome = equipe.find((m) => m.id === atual)?.nome ?? "—";
  if (!podeEditar) return <span className="truncate text-sm text-kmp-text/80">{nome}</span>;
  return (
    <div className="min-w-0">
      <select
        aria-label="Responsável"
        defaultValue={atual}
        disabled={pendente}
        className={selectClass}
        onChange={(e) =>
          iniciar(async () => {
            const r = await atualizarResponsavelDoCliente(clientId, e.target.value);
            setErro(r.error);
          })
        }
      >
        {!equipe.some((m) => m.id === atual) ? <option value={atual}>{nome}</option> : null}
        {equipe.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>
      {erro ? <p className="mt-1 text-xs text-red-700">{erro}</p> : null}
    </div>
  );
}
