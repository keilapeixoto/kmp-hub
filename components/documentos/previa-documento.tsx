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
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregou, setCarregou] = useState(false);
  const tipo = tipoDe(nome, formato);
  const url = `/api/documents/${id}/download`;

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    fetch(`${url}?json=1`)
      .then(async (r) => {
        const corpo = await r.json().catch(() => ({}));
        if (cancelado) return;
        if (r.ok && corpo.url) setLink(corpo.url);
        else setErro(corpo.error ?? `Não foi possível abrir (erro ${r.status}).`);
      })
      .catch(() => !cancelado && setErro("Sem conexão. Tente de novo."));
    return () => {
      cancelado = true;
    };
  }, [aberto, url]);

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
        onClick={() => {
          setLink(null);
          setErro(null);
          setCarregou(false);
          setAberto(true);
        }}
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
              {erro ? (
                <p className="p-6 text-center text-sm font-medium text-[#9a2433]">{erro}</p>
              ) : !link && tipo !== "outro" ? (
                <p className="text-sm font-medium text-kmp-text/70">Carregando…</p>
              ) : tipo === "pdf" && link ? (
                <iframe src={link} title={nome} className="absolute inset-0 h-full w-full border-0" />
              ) : tipo === "imagem" && link ? (
                <>
                  {!carregou ? <p className="absolute text-sm font-medium text-kmp-text/70">Carregando…</p> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária, sem otimização */}
                  <img
                    src={link}
                    alt={nome}
                    onLoad={() => setCarregou(true)}
                    onError={() => setErro("A imagem não abriu no navegador. Use \"Baixar\".")}
                    className="max-h-full max-w-full object-contain"
                  />
                </>
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
