"use client";

import { useActionState, useState } from "react";
import type { DocumentCategory } from "@/lib/documents/types";
import {
  INITIAL_UPLOAD_STATE,
  type UploadDocumentState,
} from "@/lib/storage-admin/upload-state";

/**
 * Formulário de upload reutilizado no checklist, na tela do cliente e no
 * portal (controle de armazenamento). A Server Action valida formato/tamanho
 * e checa duplicidade por hash antes de gravar — se achar duplicidade,
 * devolve o aviso em vez de subir o arquivo; o input de arquivo continua
 * selecionado (é o mesmo elemento, não desmonta), então "enviar mesmo assim"
 * só precisa marcar a caixa e reenviar.
 */
export function UploadDocumentForm({
  action,
  categories,
  className,
}: {
  action: (
    prevState: UploadDocumentState,
    formData: FormData,
  ) => Promise<UploadDocumentState>;
  categories: DocumentCategory[];
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_UPLOAD_STATE,
  );
  const [confirmar, setConfirmar] = useState(false);

  return (
    <form action={formAction} className={className ?? "flex flex-col gap-2"}>
      <div className="flex items-center gap-2">
        {categories.length > 0 ? (
          <select
            name="categoria_id"
            defaultValue=""
            className="rounded-md border border-black/10 py-1 text-xs text-kmp-graphite/70"
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
          className="flex-1 text-xs text-kmp-graphite/70"
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
          disabled={pending}
          className="rounded-md bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </div>

      {state.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}

      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <p>
            Possível duplicidade: {state.duplicates.length === 1
              ? "já existe um arquivo idêntico"
              : `já existem ${state.duplicates.length} arquivos idênticos`}
            {" — "}
            {state.duplicates
              .slice(0, 3)
              .map((d) => `${d.nome ?? "arquivo"} (${d.clienteNome ?? "—"})`)
              .join(", ")}
            .
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
