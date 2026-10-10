"use client";

import { useState } from "react";
import {
  DOCUMENT_STATUS_REVISAO_LABELS,
  type DocumentStatusRevisao,
} from "@/lib/documents/types";

const STATUS_BADGE: Record<DocumentStatusRevisao, string> = {
  pendente: "bg-amber-50 text-amber-700",
  aprovado: "bg-green-50 text-green-700",
  incorreto: "bg-red-50 text-red-700",
};

export function PastaEditor({
  pasta,
  onSave,
}: {
  pasta: string | null;
  onSave: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full bg-kmp-divider px-2 py-0.5 text-xs text-kmp-text/50 transition hover:bg-kmp-divider"
        title="Mover para pasta"
      >
        {pasta ?? "+ pasta"}
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        onSave(formData);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input
        type="text"
        name="pasta"
        autoFocus
        defaultValue={pasta ?? ""}
        placeholder="Nome da pasta"
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-28 rounded border border-kmp-divider px-1.5 py-0.5 text-xs text-kmp-text"
      />
    </form>
  );
}

export function StatusRevisaoSelect({
  status,
  onSave,
}: {
  status: DocumentStatusRevisao;
  onSave: (formData: FormData) => void;
}) {
  return (
    <form action={onSave}>
      <select
        name="status_revisao"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
      >
        {Object.entries(DOCUMENT_STATUS_REVISAO_LABELS).map(([slug, label]) => (
          <option key={slug} value={slug}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
