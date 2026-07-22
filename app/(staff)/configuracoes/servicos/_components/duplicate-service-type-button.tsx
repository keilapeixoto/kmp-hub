"use client";

import { useTransition } from "react";
import { duplicateServiceType } from "../actions";

export function DuplicateServiceTypeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => duplicateServiceType(id))}
      className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange disabled:opacity-60"
    >
      {pending ? "Duplicando…" : "Duplicar pipeline"}
    </button>
  );
}
