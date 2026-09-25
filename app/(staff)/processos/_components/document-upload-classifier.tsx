"use client";

import { useState } from "react";
import { uploadAndClassifyDocument } from "../document-classification-actions";

type UploadItem = {
  id: string;
  fileName: string;
  status: "enviando" | "confirmado" | "revisar" | "erro";
  message: string;
};

/**
 * Arrastar-e-soltar que classifica sozinho (docs/spec-controle-documentos.md).
 * Cada arquivo é uma chamada independente de uploadAndClassifyDocument —
 * resolve e atualiza a lista assim que termina, sem travar o lote inteiro
 * esperando os outros.
 */
export function DocumentUploadClassifier({
  clientId,
  caseId,
  clienteNome,
}: {
  clientId: string;
  caseId: string;
  clienteNome: string;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList) {
    Array.from(fileList).forEach((file) => {
      const localId = `${file.name}-${Date.now()}-${Math.random()}`;
      setItems((prev) => [
        { id: localId, fileName: file.name, status: "enviando", message: "Enviando e classificando…" },
        ...prev,
      ]);

      const formData = new FormData();
      formData.append("file", file);

      uploadAndClassifyDocument(clientId, caseId, clienteNome, formData).then((result) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === localId
              ? {
                  ...it,
                  status: !result.ok ? "erro" : result.pendingReview ? "revisar" : "confirmado",
                  message: result.message,
                }
              : it,
          ),
        );
      });
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-kmp-orange bg-kmp-orange/5" : "border-black/15"
        }`}
      >
        <p className="text-sm text-kmp-graphite/70">
          Arraste documentos aqui — o sistema identifica o tipo e vincula ao checklist sozinho
        </p>
        <label className="mt-3 inline-block cursor-pointer rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
          Escolher arquivos
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className={`rounded-md p-2 text-xs ${
                it.status === "confirmado"
                  ? "bg-green-50 text-green-800"
                  : it.status === "revisar"
                    ? "bg-amber-50 text-amber-800"
                    : it.status === "erro"
                      ? "bg-red-50 text-red-800"
                      : "bg-black/5 text-kmp-graphite/60"
              }`}
            >
              <span className="font-medium">{it.fileName}</span> — {it.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
