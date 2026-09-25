"use client";

import { useTransition } from "react";
import { DEADLINE_STATUSES } from "@/lib/case-deadlines/constants";
import type { DeadlineStatus } from "@/lib/case-deadlines/constants";
import { updateDeadlineStatus } from "../actions";

export function DeadlineStatusSelect({
  id,
  status,
}: {
  id: string;
  status: DeadlineStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateDeadlineStatus(id, value);
        });
      }}
      className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange disabled:opacity-60"
    >
      {DEADLINE_STATUSES.map((s) => (
        <option key={s.slug} value={s.slug}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
