"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
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
  checklistItemId: string | null;
  categories: DocumentCategory[];
}) {
  const uploadWithIds = uploadPortalDocument.bind(null, clientId, caseId, checklistItemId);
  const [state, formAction, isPending] = useActionState(uploadWithIds, INITIAL_UPLOAD_STATE);
  const [confirmar, setConfirmar] = useState(false);
  const [arquivo, setArquivo] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setArquivo(null); // o formulário é limpo depois do envio
      }}
      className="mt-3 flex flex-col gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {categories.length > 0 ? (
          <select
            name="categoria_id"
            defaultValue=""
            className="rounded-full border border-kmp-text/15 bg-white/80 px-3 py-2 text-sm text-kmp-text"
          >
            <option value="">Tipo de documento…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        ) : null}
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border border-dashed border-kmp-text/25 bg-white/70 px-4 py-2 text-sm text-kmp-text/75 transition hover:border-kmp-text/40">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">{arquivo ?? "Escolher arquivo ou tirar foto"}</span>
          <input
            type="file"
            name="file"
            required
            className="sr-only"
            onChange={(e) => setArquivo(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {state.duplicates && state.duplicates.length > 0 ? (
          <input type="hidden" name="confirmar_duplicata" value={confirmar ? "true" : "false"} />
        ) : null}
        <button
          type="submit"
          disabled={isPending || !arquivo}
          className="shrink-0 rounded-full bg-kmp-primary px-5 py-2 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Enviando…" : "Enviar"}
        </button>
      </div>

      {state.error ? <p className="text-sm text-[#b0283b]">{state.error}</p> : null}

      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="rounded-2xl bg-[#fcf1cf] p-3 text-sm text-[#7a5806]">
          <p>Parece que você já enviou um arquivo igual a esse antes.</p>
          <label className="mt-1 flex items-center gap-1.5">
            <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} />
            Enviar mesmo assim
          </label>
        </div>
      ) : null}
    </form>
  );
}
