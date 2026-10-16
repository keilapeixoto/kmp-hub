"use client";

import { tradutor, type Idioma } from "@/lib/portal/i18n";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload, X } from "lucide-react";
import type { DocumentCategory } from "@/lib/documents/types";
import { createClient } from "@/lib/supabase/client";
import { caminhoNoBucket, problemaDoArquivo, textoDeFormatos } from "@/lib/portal/arquivos";
import type { ArquivoEnviado, RegistroState } from "@/lib/portal/arquivos";

async function sha256(file: File): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

// Envio de vários arquivos de uma vez (pedido da Keila — o formulário antigo
// dela já aceitava), usado no portal e no Hub: o navegador sobe cada arquivo
// direto para a pasta do cliente no Storage (RLS do Storage confere) e depois
// `registrar` (Server Action) confere e grava todos em `documents`.
export function UploadMultiplo({
  clientId,
  pastaProcesso,
  categories,
  bucket,
  regras,
  registrar,
  rotulo,
  pedirDescricao = false,
  idioma = "pt",
}: {
  clientId: string;
  /** id do processo, ou "geral" para arquivo do cliente sem processo */
  pastaProcesso: string;
  categories: DocumentCategory[];
  bucket: string;
  regras: { extensoes: string[]; maxBytes: number };
  registrar: (arquivos: ArquivoEnviado[], categoriaId: string | null, descricao: string | null) => Promise<RegistroState>;
  rotulo?: string;
  /** pede "Qual documento é?" (envio fora da lista, ex.: "Outros documentos") */
  pedirDescricao?: boolean;
  /** Portal: idioma escolhido pelo cliente. No Hub fica em português. */
  idioma?: Idioma;
}) {
  const t = tradutor(idioma);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<number | null>(null);

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos = Array.from(lista);
    const problema = novos.map((f) => problemaDoArquivo({ nome: f.name, tamanho: f.size }, regras, idioma)).find(Boolean);
    setErro(problema ?? null);
    setOk(null);
    setArquivos((atuais) => [
      ...atuais,
      ...novos.filter((f) => !problemaDoArquivo({ nome: f.name, tamanho: f.size }, regras)),
    ]);
  }

  async function enviar() {
    if (arquivos.length === 0) return;
    if (pedirDescricao && !descricao.trim()) {
      setErro(t("upload.qualDocumento"));
      return;
    }
    setErro(null);
    const supabase = createClient();
    const enviados: ArquivoEnviado[] = [];
    for (let i = 0; i < arquivos.length; i++) {
      const f = arquivos[i];
      setProgresso(t("upload.enviando", { i: i + 1, n: arquivos.length }));
      const caminho = caminhoNoBucket(clientId, pastaProcesso, f.name);
      const { error } = await supabase.storage.from(bucket).upload(caminho, f, { contentType: f.type || undefined });
      if (error) {
        setProgresso(null);
        setErro(t("upload.falhou", { nome: f.name }));
        if (enviados.length === 0) return;
        break;
      }
      enviados.push({ caminho, nome: f.name, hash: await sha256(f) });
    }
    setProgresso(t("upload.registrando"));
    const r = await registrar(enviados, categoria || null, descricao.trim() || null);
    setProgresso(null);
    if (r.error) {
      setErro(r.error);
      return;
    }
    setOk(r.enviados);
    setDescricao("");
    setArquivos((atuais) => atuais.slice(enviados.length));
    router.refresh();
  }

  const ocupado = progresso !== null;

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        disabled={ocupado}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          adicionar(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-4 text-center text-sm transition ${
          arrastando ? "border-kmp-orange bg-[#f27b20]/10" : "border-kmp-text/20 bg-white/60 hover:border-kmp-text/40 dark:bg-white/5"
        }`}
      >
        <span className="flex items-center gap-2 font-semibold text-kmp-text">
          <Upload className="h-4 w-4" /> {rotulo ?? t("upload.escolher")}
        </span>
        <span className="text-xs text-kmp-text/60">{textoDeFormatos(regras, idioma)}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = "";
        }}
      />

      {arquivos.length > 0 ? (
        <div className="space-y-2">
          <ul className="space-y-1">
            {arquivos.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-sm text-kmp-text dark:bg-white/10">
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-kmp-text/60">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                {!ocupado ? (
                  <button
                    type="button"
                    aria-label={t("upload.tirar", { nome: f.name })}
                    onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}
                    className="text-kmp-text/60 hover:text-kmp-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {pedirDescricao ? (
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={120}
              placeholder={t("upload.placeholder")}
              className="w-full rounded-full border border-kmp-text/15 bg-white/85 px-4 py-2 text-sm text-kmp-text outline-none focus:border-kmp-orange dark:bg-white/10"
            />
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {categories.length > 0 ? (
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="rounded-full border border-kmp-text/15 bg-white/85 px-3 py-2 text-sm text-kmp-text"
              >
                <option value="">{t("upload.tipo")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={enviar}
              disabled={ocupado}
              className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
            >
              {progresso ?? (arquivos.length === 1 ? t("upload.enviar1") : t("upload.enviarN", { n: arquivos.length }))}
            </button>
          </div>
        </div>
      ) : null}

      {ok ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-[#16673f]">
          <Check className="h-4 w-4" /> {ok === 1 ? t("upload.ok1") : t("upload.okN", { n: ok })} {t("upload.equipeRecebeu")}
        </p>
      ) : null}
      {erro ? <p className="text-sm text-[#b0283b]">{erro}</p> : null}
    </div>
  );
}
