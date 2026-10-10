"use client";

import { useTransition } from "react";
import { acknowledgeAlert } from "../actions";

export function AcknowledgeAlertButton({ alertId }: { alertId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => acknowledgeAlert(alertId))}
      className="shrink-0 text-xs text-white/60 transition hover:text-kmp-orange disabled:opacity-60"
    >
      {pending ? "…" : "Reconhecer"}
    </button>
  );
}
