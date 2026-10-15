"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Eye, X } from "lucide-react";

const IMAGENS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp"];

function tipoDe(nome: string, formato: string | null): "pdf" | "imagem" | "outro" {
  const ext = (formato || nome.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (IMAGENS.includes(ext)) return "imagem";
  return "outro";
}

// Pré-visualização dentro do Hub: abre o documento numa janela por cima da
// página. O link passa por /api/documents/[id]/download, que confere o RLS e
// gera uma URL assinada de 5 minutos.
export function PreviaDocumento({ id, nome, formato }: { id: string; nome: string; formato: string | null }) {
  const [aberto, setAberto] = useState(false);
  const tipo = tipoDe(nome, formato);
  const url = `/api/documents/${id}/download`;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Visualizar ${nome}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-kmp-text/70 transition hover:bg-kmp-text/10 hover:text-kmp-text"
      >
        <Eye className="h-4 w-4" />
      </button>
      {aberto
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={nome}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-kmp-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-kmp-divider px-5 py-3">
              <p className="min-w-0 truncate font-semibold text-kmp-text">{nome}</p>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`${url}?baixar=1`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-kmp-text/5 px-3 py-1.5 text-sm font-semibold text-kmp-text hover:bg-kmp-text/10"
                >
                  <Download className="h-4 w-4" /> Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-kmp-text/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-kmp-text/5">
              {tipo === "pdf" ? (
                <iframe src={url} title={nome} className="absolute inset-0 h-full w-full border-0" />
              ) : tipo === "imagem" ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária, sem otimização
                <img src={url} alt={nome} className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-sm text-kmp-text/70">
                  Este formato não abre no navegador. Use &quot;Baixar&quot; para ver o arquivo.
                </p>
              )}
            </div>
          </div>
        </div>,
            // Fora do cartão: os cartões têm backdrop-filter (vidro), que vira
            // o "contêiner" do position:fixed e prendia a janela dentro dele.
            document.body,
          )
        : null}
    </>
  );
}
