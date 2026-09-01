"use client";

import { useState, useTransition } from "react";
import { DOCUMENT_TYPES } from "@/lib/documents/constants";
import { confirmDocumentClassification } from "../document-classification-actions";

type ChecklistItemOption = { id: string; nome: string };

export function ConfirmClassificationRow({
  documentId,
  caseId,
  fileName,
  url,
  suggestedType,
  suggestedConfidence,
  checklistItemOptions,
}: {
  documentId: string;
  caseId: string;
  fileName: string;
  url: string | null;
  suggestedType: string | null;
  suggestedConfidence: number | null;
  checklistItemOptions: ChecklistItemOption[];
}) {
  const [documentType, setDocumentType] = useState(suggestedType ?? "outro");
  const [checklistItemId, setChecklistItemId] = useState("");
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"editando" | "confirmado" | "erro">("editando");

  if (state === "confirmado") {
    return (
      <li className="rounded-md bg-green-50 p-3 text-sm text-green-800">
        {fileName} — confirmado e vinculado.
      </li>
    );
  }

  return (
    <li className="rounded-md bg-white p-3">
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-kmp-graphite hover:text-kmp-orange"
      >
        {fileName}
      </a>
      {suggestedType ? (
        <p className="mt-0.5 text-xs text-kmp-graphite/60">
          Sugestão da IA: {suggestedType} ({Math.round((suggestedConfidence ?? 0) * 100)}% de
          confiança)
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={pending}
          className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={nomePersonalizado}
          onChange={(e) => setNomePersonalizado(e.target.value)}
          disabled={pending}
          placeholder="Nome do arquivo (opcional)"
          className="min-w-[180px] flex-1 rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
        />
        <select
          value={checklistItemId}
          onChange={(e) => setChecklistItemId(e.target.value)}
          disabled={pending}
          className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
        >
          <option value="">Sem vínculo com item do checklist</option>
          {checklistItemOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const formData = new FormData();
            formData.set("document_type", documentType);
            formData.set("checklist_item_id", checklistItemId);
            formData.set("nome_personalizado", nomePersonalizado);
            startTransition(async () => {
              const result = await confirmDocumentClassification(documentId, caseId, formData);
              setState(result.ok ? "confirmado" : "erro");
            });
          }}
          className="rounded-md bg-kmp-orange px-3 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Confirmando…" : "Confirmar"}
        </button>
      </div>
      {state === "erro" ? (
        <p className="mt-1 text-xs text-red-600">
          Não foi possível confirmar — tente de novo.
        </p>
      ) : null}
    </li>
  );
}
