"use client";

import { useState, useTransition } from "react";
import { daysUntil } from "@/lib/clients/utils";
import { REQUEST_TYPE_LABELS } from "@/lib/case-deadlines/constants";
import { getReminderEmail } from "@/lib/case-deadlines/email-templates";
import type { DueReminder } from "@/lib/case-deadlines/types";
import { sendReminderNow } from "../actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function DueReminderRow({ item, canSend }: { item: DueReminder; canSend: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error: string | null } | null>(null);

  const { deadline, milestone } = item;
  const dias = daysUntil(deadline.prazo_final);
  const preview = getReminderEmail(milestone, {
    nome_estudante: deadline.client_nome,
    tipo_documento: REQUEST_TYPE_LABELS[deadline.tipo_pedido] ?? deadline.tipo_pedido,
    data_limite: formatDate(deadline.prazo_final),
    dias_restantes: dias,
  });

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-kmp-graphite">
            {deadline.client_nome} · marco de {milestone}d
          </p>
          <p className="text-xs text-kmp-graphite/60">
            {deadline.client_email ?? "sem e-mail cadastrado"} · assunto: &quot;{preview.subject}
            &quot;
          </p>
        </div>
        {canSend ? (
          <button
            type="button"
            disabled={pending || result?.ok || !deadline.client_email}
            onClick={() =>
              startTransition(async () => {
                const r = await sendReminderNow(deadline.id, milestone);
                setResult(r);
              })
            }
            className="shrink-0 rounded-md bg-kmp-orange px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Enviando…" : result?.ok ? "Enviado" : "Enviar"}
          </button>
        ) : null}
      </div>
      {result && !result.ok ? <p className="mt-2 text-xs text-red-700">{result.error}</p> : null}
      <details className="mt-2 text-xs text-kmp-graphite/70">
        <summary className="cursor-pointer">Ver texto do e-mail</summary>
        <div className="mt-1 space-y-2 rounded-md bg-white p-3">
          {preview.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

export function DueRemindersPanel({
  dueReminders,
  canSend,
}: {
  dueReminders: DueReminder[];
  canSend: boolean;
}) {
  if (dueReminders.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg text-kmp-graphite">
        Lembretes pendentes de hoje ({dueReminders.length})
      </h2>
      <p className="text-xs text-kmp-graphite/60">
        Modo revisão manual — nada é enviado sozinho ainda. Revise o texto e clique em enviar.
      </p>
      <div className="space-y-2">
        {dueReminders.map((item) => (
          <DueReminderRow
            key={`${item.deadline.id}-${item.milestone}`}
            item={item}
            canSend={canSend}
          />
        ))}
      </div>
    </div>
  );
}
