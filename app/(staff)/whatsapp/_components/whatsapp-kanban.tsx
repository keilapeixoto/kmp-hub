"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { WhatsappConversation } from "@/lib/whatsapp/types";
import {
  CONVERSATION_STAGE_LABELS,
  CONVERSATION_STAGE_ORDER,
  type ConversationStage,
} from "@/lib/whatsapp/constants";
import { updateConversationEtapaDrag } from "../actions";

const STAGE_COLUMN_STYLE: Record<ConversationStage, string> = {
  novo_contato: "bg-blue-50",
  aguardando_resposta_cliente: "bg-amber-50",
  aguardando_resposta_equipe: "bg-red-50",
  pendencia_documento: "bg-orange-50",
  agendamento: "bg-purple-50",
  resolvido: "bg-green-50",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "Sem mensagens ainda";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhatsappKanban({
  buckets: initialBuckets,
}: {
  buckets: Record<ConversationStage, WhatsappConversation[]>;
}) {
  const [buckets, setBuckets] = useState(initialBuckets);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleDrop(etapa: ConversationStage, conversationId: string) {
    setBuckets((prev) => {
      const next = { ...prev };
      let moved: WhatsappConversation | undefined;
      for (const key of CONVERSATION_STAGE_ORDER) {
        const found = next[key].find((c) => c.id === conversationId);
        if (found) {
          moved = found;
          next[key] = next[key].filter((c) => c.id !== conversationId);
        }
      }
      if (moved) next[etapa] = [{ ...moved, etapa }, ...next[etapa]];
      return next;
    });

    startTransition(async () => {
      await updateConversationEtapaDrag(conversationId, etapa);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CONVERSATION_STAGE_ORDER.map((etapa) => {
        const rows = buckets[etapa];
        return (
          <div
            key={etapa}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const conversationId = e.dataTransfer.getData("text/conversation-id");
              if (conversationId) handleDrop(etapa, conversationId);
            }}
            className={`flex w-64 shrink-0 flex-col rounded-lg p-3 ${STAGE_COLUMN_STYLE[etapa]}`}
          >
            <h3 className="mb-3 flex items-center justify-between font-heading text-sm text-kmp-graphite">
              {CONVERSATION_STAGE_LABELS[etapa]}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-kmp-graphite/60">
                {rows.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {rows.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/conversation-id", c.id)}
                  className="cursor-grab rounded-md bg-white p-3 text-sm shadow-sm transition hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-kmp-graphite">{c.nome_contato}</p>
                    {c.nao_lida ? (
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-kmp-orange" title="Não lida" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-kmp-graphite/60">{c.telefone}</p>
                  {c.ultima_mensagem_preview ? (
                    <p className="mt-1 line-clamp-2 text-xs text-kmp-graphite/70">
                      {c.ultima_mensagem_preview}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-kmp-graphite/40">
                    {formatDateTime(c.ultima_mensagem_em)}
                  </p>
                </div>
              ))}
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
