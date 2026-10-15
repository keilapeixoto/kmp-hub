"use client";

import { useState } from "react";
import type { DocumentCategory } from "@/lib/documents/types";
import { UploadMultiplo } from "@/components/documentos/upload-multiplo";
import { DOCUMENTS_BUCKET } from "@/lib/documents/bucket";
import { registrarArquivosDoCliente } from "../actions";

// Envio de arquivos pela equipe, no topo da aba Documentos do cliente: escolhe
// o processo (opcional) e manda vários arquivos de uma vez.
export function EnvioDoHub({
  clientId,
  processos,
  categories,
  regras,
}: {
  clientId: string;
  processos: { id: string; nome: string }[];
  categories: DocumentCategory[];
  regras: { extensoes: string[]; maxBytes: number };
}) {
  const [processo, setProcesso] = useState("");
  return (
    <div className="space-y-2">
      {processos.length > 0 ? (
        <label className="flex flex-col gap-1 text-sm font-semibold text-kmp-text sm:flex-row sm:items-center sm:gap-3">
          Processo
          <select
            value={processo}
            onChange={(e) => setProcesso(e.target.value)}
            className="rounded-full border border-kmp-text/15 bg-white/85 px-3 py-2 text-sm font-normal text-kmp-text dark:bg-white/10"
          >
            <option value="">Sem processo (arquivo geral do cliente)</option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <UploadMultiplo
        key={processo}
        clientId={clientId}
        pastaProcesso={processo || "geral"}
        categories={categories}
        bucket={DOCUMENTS_BUCKET}
        regras={regras}
        registrar={registrarArquivosDoCliente.bind(null, clientId, processo || null)}
        rotulo="Escolher arquivos ou arrastar aqui"
      />
    </div>
  );
}
