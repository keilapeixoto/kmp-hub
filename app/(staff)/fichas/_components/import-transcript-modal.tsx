"use client";

import { useState, useTransition } from "react";
import type { ConsultationFormData } from "@/lib/consultation-forms/types";
import { extractConsultationDataFromTranscript } from "../actions";

export function ImportTranscriptModal({
  formId,
  onClose,
  onApplied,
}: {
  formId: string;
  onClose: () => void;
  onApplied: (data: ConsultationFormData, pendingSections: string[]) => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function process() {
    setStatus(null);
    startTransition(async () => {
      const result = await extractConsultationDataFromTranscript(formId, transcript);
      if (result.error || !result.data) {
        setStatus(result.error ?? "Erro ao processar.");
        return;
      }
      onApplied(result.data, result.pendingSections);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-7 shadow-2xl">
        <h3 className="font-heading text-xl font-bold text-kmp-graphite">
          Importar transcrição da consulta
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-kmp-graphite/60">
          Cole abaixo o texto da transcrição ou o resumo gerado pela sua ferramenta de gravação.
          A ficha vai preencher os campos automaticamente — cada seção preenchida pela IA fica
          marcada até você revisar e confirmar.
        </p>
        <textarea
          className="mt-3.5 min-h-[220px] w-full resize-y rounded-md border border-black/10 p-3 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none"
          placeholder="Cole aqui a transcrição ou o resumo da consulta..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <div className="mt-3.5 flex items-center gap-2.5">
          {status ? <span className="mr-auto text-xs text-red-600">{status}</span> : <span className="mr-auto" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-kmp-graphite hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={process}
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Processando…" : "Processar e preencher"}
          </button>
        </div>
      </div>
    </div>
  );
}
