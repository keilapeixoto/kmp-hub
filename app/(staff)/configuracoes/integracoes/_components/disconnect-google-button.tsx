"use client";

import { useTransition } from "react";
import { disconnectGoogle } from "../actions";

export function DisconnectGoogleButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => disconnectGoogle())}
      className="shrink-0 rounded-md border border-kmp-graphite/20 px-4 py-2 text-sm font-medium text-kmp-graphite transition hover:bg-kmp-graphite/5 disabled:opacity-50"
    >
      {isPending ? "Desconectando..." : "Desconectar"}
    </button>
  );
}
