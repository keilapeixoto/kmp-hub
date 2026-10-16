"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VisaPanelRow } from "@/lib/vencimentos/data";
import { daysUntil } from "@/lib/clients/utils";
import { Pencil } from "lucide-react";
import { BUCKET_ORDER, type VisaBucket } from "@/lib/vencimentos/constants";
import { renomearColuna, updateVisaBucketDrag } from "../actions";

/** Cor do destaque do vencimento no card, na mesma escala das colunas. */
const DESTAQUE: Record<VisaBucket, string> = {
  vencido: "bg-red-600 text-white",
  critico: "bg-red-500 text-white",
  atencao: "bg-orange-500 text-white",
  monitorar: "bg-amber-400 text-[#4a2a00]",
  sem_urgencia: "bg-emerald-600 text-white",
  sem_data: "bg-kmp-text/10 text-kmp-text/70",
};

function TituloDaColuna({
  bucket,
  nome,
  total,
  podeRenomear,
}: {
  bucket: VisaBucket;
  nome: string;
  total: number;
  podeRenomear: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  if (editando) {
    return (
      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          const novo = String(new FormData(e.currentTarget).get("nome") ?? "");
          iniciar(async () => {
            const r = await renomearColuna(bucket, novo);
            setErro(r.error);
            if (!r.error) {
              setEditando(false);
              router.refresh();
            }
          });
        }}
      >
        <input
          name="nome"
          autoFocus
          defaultValue={nome}
          maxLength={40}
          placeholder="Vazio volta ao nome padrão"
          className="w-full rounded-full border border-kmp-divider bg-kmp-surface px-3 py-1 text-sm text-kmp-text"
          onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
        />
        <div className="mt-1 flex gap-2 text-xs">
          <button type="submit" disabled={pendente} className="font-semibold text-kmp-text">
            {pendente ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} className="text-kmp-text/60">
            Cancelar
          </button>
        </div>
        {erro ? <p className="mt-1 text-xs text-red-700">{erro}</p> : null}
      </form>
    );
  }
  return (
    <h3 className="group mb-3 flex items-center justify-between gap-2 font-heading text-sm text-kmp-text">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{nome}</span>
        {podeRenomear ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={`Renomear a coluna ${nome}`}
            className="rounded-full p-1 text-kmp-text/40 opacity-0 transition hover:bg-kmp-text/10 hover:text-kmp-text group-hover:opacity-100 focus:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </span>
      <span className="rounded-full bg-kmp-surface px-2 py-0.5 text-xs text-kmp-text/60 dark:bg-white/10">{total}</span>
    </h3>
  );
}

const BUCKET_COLUMN_STYLE: Record<VisaBucket, string> = {
  vencido: "bg-red-100 dark:border dark:border-red-400/20 dark:bg-red-400/10",
  critico: "bg-red-50 dark:border dark:border-red-400/20 dark:bg-red-400/10",
  atencao: "bg-orange-50 dark:border dark:border-orange-400/20 dark:bg-orange-400/10",
  monitorar: "bg-amber-50 dark:border dark:border-amber-400/20 dark:bg-amber-400/10",
  sem_urgencia: "bg-kmp-divider dark:border dark:border-white/10 dark:bg-white/5",
  sem_data: "bg-gray-100 dark:border dark:border-white/10 dark:bg-white/5",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function VencimentosKanban({
  buckets: initialBuckets,
  nomes,
  podeRenomear,
}: {
  buckets: Record<VisaBucket, VisaPanelRow[]>;
  nomes: Record<VisaBucket, string>;
  podeRenomear: boolean;
}) {
  const [buckets, setBuckets] = useState(initialBuckets);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleDrop(bucket: VisaBucket, clientId: string) {
    setBuckets((prev) => {
      const next = { ...prev };
      let moved: VisaPanelRow | undefined;
      for (const key of BUCKET_ORDER) {
        const found = next[key].find((c) => c.id === clientId);
        if (found) {
          moved = found;
          next[key] = next[key].filter((c) => c.id !== clientId);
        }
      }
      if (moved) next[bucket] = [...next[bucket], moved];
      return next;
    });

    startTransition(async () => {
      await updateVisaBucketDrag(clientId, bucket);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BUCKET_ORDER.map((bucket) => {
        const rows = buckets[bucket];
        return (
          <div
            key={bucket}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const clientId = e.dataTransfer.getData("text/client-id");
              if (clientId) handleDrop(bucket, clientId);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-lg p-3 ${BUCKET_COLUMN_STYLE[bucket]}`}
          >
            <TituloDaColuna bucket={bucket} nome={nomes[bucket]} total={rows.length} podeRenomear={podeRenomear} />
            <div className="flex flex-col gap-2">
              {rows.map((c) => {
                const dias = c.visto_atual_validade
                  ? daysUntil(c.visto_atual_validade)
                  : null;
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/client-id", c.id)
                    }
                    className="block overflow-hidden rounded-md bg-kmp-surface p-3 text-sm shadow-sm transition hover:shadow-md dark:border dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    {/* Vencimento em destaque: data grande e quanto falta, na cor da coluna. */}
                    <div className={`-mx-3 -mt-3 mb-2 flex items-end justify-between gap-2 rounded-t-md px-3 py-2 ${DESTAQUE[bucket]}`}>
                      <div className="leading-tight">
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Visto vence</p>
                        <p className="font-heading text-lg font-bold">
                          {c.visto_atual_validade ? formatDate(c.visto_atual_validade) : "Sem data"}
                        </p>
                      </div>
                      {dias !== null ? (
                        <p className="text-right text-xs font-semibold">
                          {dias < 0 ? `venceu há ${Math.abs(dias)}d` : dias === 0 ? "vence hoje" : `faltam ${dias}d`}
                        </p>
                      ) : null}
                    </div>
                    <Link href={`/clientes/${c.id}`} className="font-medium text-kmp-text hover:text-kmp-orange">
                      {c.nome}
                    </Link>
                    <p className="mt-0.5 text-xs text-kmp-text/60">
                      {c.visto_atual_subclasse ? `Visto ${c.visto_atual_subclasse}` : "Subclasse não informada"}
                    </p>
                    {c.temProcessoAtivo ? (
                      <p className="mt-2 text-[11px] font-semibold text-[#16673f] dark:text-[#a9e6c7]">Com processo em andamento</p>
                    ) : (
                      <Link
                        href={`/processos/novo?clientId=${c.id}`}
                        className="mt-2 inline-flex rounded-full bg-kmp-orange/15 px-2.5 py-1 text-[11px] font-semibold text-[#8f3f07] hover:bg-kmp-orange/25 dark:text-[#f9c39b]"
                      >
                        Alocar próximo processo
                      </Link>
                    )}
                  </div>
                );
              })}
              {rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-kmp-divider p-3 text-center text-xs text-kmp-text/40">
                  Vazio
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
