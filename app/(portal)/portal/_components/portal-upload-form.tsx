"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPortalDocument } from "../actions";

export function PortalUploadForm({
  clientId,
  caseId,
  checklistItemId,
}: {
  clientId: string;
  caseId: string;
  checklistItemId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await uploadPortalDocument(clientId, caseId, checklistItemId, formData);
          setSent(true);
          formRef.current?.reset();
        });
      }}
      className="mt-4 flex items-center gap-3 border-t border-black/5 pt-4"
    >
      <input
        type="file"
        name="file"
        required
        className="flex-1 text-sm text-kmp-graphite/70 file:mr-3 file:rounded-md file:border-0 file:bg-kmp-graphite/10 file:px-3 file:py-1.5 file:text-sm file:text-kmp-graphite"
      />
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Enviando…" : "Enviar"}
      </button>
      {sent && !isPending ? (
        <span className="shrink-0 text-xs text-green-700">Enviado ✓</span>
      ) : null}
    </form>
  );
}
