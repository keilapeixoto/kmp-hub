"use client";

import { useActionState, useState } from "react";
import type { DocumentCategory } from "@/lib/documents/types";
import { INITIAL_UPLOAD_STATE } from "@/lib/storage-admin/upload-state";
import { uploadPortalDocument } from "../actions";

export function PortalUploadForm({
  clientId,
  caseId,
  checklistItemId,
  categories,
}: {
  clientId: string;
  caseId: string;
  checklistItemId: string;
  categories: DocumentCategory[];
}) {
  const uploadWithIds = uploadPortalDocument.bind(
    null,
    clientId,
    caseId,
    checklistItemId,
  );
  const [state, formAction, isPending] = useActionState(
    uploadWithIds,
    INITIAL_UPLOAD_STATE,
  );
  const [confirmar, setConfirmar] = useState(false);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4"
    >
      <div className="flex items-center gap-3">
        {categories.length > 0 ? (
          <select
            name="categoria_id"
            defaultValue=""
            className="rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite/70"
          >
            <option value="">Categoria…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-sm text-kmp-graphite/70 file:mr-3 file:rounded-md file:border-0 file:bg-kmp-graphite/10 file:px-3 file:py-1.5 file:text-sm file:text-kmp-graphite"
        />
        {state.duplicates && state.duplicates.length > 0 ? (
          <input
            type="hidden"
            name="confirmar_duplicata"
            value={confirmar ? "true" : "false"}
          />
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Enviar"}
        </button>
      </div>

      {state.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}

      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <p>
            Parece que você já enviou um arquivo igual a esse antes.
          </p>
          <label className="mt-1 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={confirmar}
              onChange={(e) => setConfirmar(e.target.checked)}
            />
            Enviar mesmo assim
          </label>
        </div>
      ) : null}
    </form>
  );
}
