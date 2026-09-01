"use client";

import { useState, useTransition } from "react";
import { REMINDER_MILESTONES, type ReminderMilestone } from "@/lib/case-deadlines/constants";
import { sendReminderNow } from "../actions";

export function SendReminderControl({ deadlineId }: { deadlineId: string }) {
  const [milestone, setMilestone] = useState<ReminderMilestone>(REMINDER_MILESTONES[0]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error: string | null } | null>(null);

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={milestone}
        onChange={(e) => {
          setMilestone(Number(e.target.value) as ReminderMilestone);
          setResult(null);
        }}
        disabled={pending}
        className="rounded-md border border-black/10 px-1.5 py-1 text-xs text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange disabled:opacity-60"
      >
        {REMINDER_MILESTONES.map((m) => (
          <option key={m} value={m}>
            Lembrete {m}d
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await sendReminderNow(deadlineId, milestone);
            setResult(r);
          })
        }
        className="rounded-md bg-kmp-orange px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        title="Envia esse lembrete agora, mesmo fora do marco automático"
      >
        {pending ? "Enviando…" : "Enviar"}
      </button>
      {result ? (
        <span className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>
          {result.ok ? "Enviado" : result.error}
        </span>
      ) : null}
    </div>
  );
}
