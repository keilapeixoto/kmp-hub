"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VisaPanelRow } from "@/lib/vencimentos/data";
import { daysUntil } from "@/lib/clients/utils";
import { VISA_URGENCY_LABELS } from "@/lib/clients/constants";
import { updateVisaBucketDrag, type VisaBucket } from "../actions";

export const BUCKET_ORDER: VisaBucket[] = [
  "vencido",
  "critico",
  "atencao",
  "monitorar",
  "sem_urgencia",
  "sem_data",
];

const BUCKET_LABELS: Record<VisaBucket, string> = {
  ...VISA_URGENCY_LABELS,
  sem_data: "Sem data cadastrada",
};

const BUCKET_COLUMN_STYLE: Record<VisaBucket, string> = {
  vencido: "bg-red-100",
  critico: "bg-red-50",
  atencao: "bg-orange-50",
  monitorar: "bg-amber-50",
  sem_urgencia: "bg-black/5",
  sem_data: "bg-gray-100",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function VencimentosKanban({
  buckets: initialBuckets,
}: {
  buckets: Record<VisaBucket, VisaPanelRow[]>;
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
            <h3 className="mb-3 flex items-center justify-between font-heading text-sm text-kmp-graphite">
              {BUCKET_LABELS[bucket]}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-kmp-graphite/60">
                {rows.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {rows.map((c) => {
                const dias = c.visto_atual_validade
                  ? daysUntil(c.visto_atual_validade)
                  : null;
                return (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.id}`}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/client-id", c.id)
                    }
                    className="block rounded-md bg-white p-3 text-sm shadow-sm transition hover:shadow-md"
                  >
                    <p className="font-medium text-kmp-graphite">{c.nome}</p>
                    <p className="mt-1 text-xs text-kmp-graphite/60">
                      {c.visto_atual_subclasse ?? "Subclasse não informada"}
                    </p>
                    <p className="mt-0.5 text-xs text-kmp-graphite/50">
                      {c.visto_atual_validade && dias !== null
                        ? `${formatDate(c.visto_atual_validade)} · ${
                            dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`
                          }`
                        : "Sem data cadastrada"}
                    </p>
                  </Link>
                );
              })}
              {rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-black/10 p-3 text-center text-xs text-kmp-graphite/40">
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
