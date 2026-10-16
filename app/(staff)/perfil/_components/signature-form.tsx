"use client";

import { useActionState, useState } from "react";
import { PenLine } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import type { DadosDaAssinatura } from "@/lib/email/assinatura";
import { salvarAssinatura, type AssinaturaState } from "../actions";

// Assinatura de e-mail de quem está logado: vai no fim dos e-mails enviados
// pelo Hub (perfil do cliente → Enviar e-mail).

const inicial: AssinaturaState = { error: null, ok: false };
const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function SignatureForm({ atual }: { atual: DadosDaAssinatura }) {
  const [state, formAction, salvando] = useActionState(salvarAssinatura, inicial);
  const [fecho, setFecho] = useState(atual.fecho ?? "");
  const [whatsapp, setWhatsapp] = useState(atual.whatsapp ?? "");
  const [instagram, setInstagram] = useState(atual.instagram ?? "");
  const [imagemLocal, setImagemLocal] = useState<string | null>(null);
  const [remover, setRemover] = useState(false);

  const urlDaPrevia = remover ? null : (imagemLocal ?? atual.url);
  // Mesmas regras de lib/email/assinatura.ts (link só aparece se for válido).
  const zap = whatsapp.replace(/\D/g, "");
  const insta = instagram.trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Assinatura de e-mail" cor="laranja" icon={PenLine} />
      <p className="mb-4 text-sm text-kmp-text/70">
        Vai no fim dos e-mails que você manda pelo Hub. Use a imagem pronta da sua assinatura (PNG ou JPG).
        Os links abaixo dela ficam clicáveis no e-mail (botões dentro da imagem não ficam).
      </p>

      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="assinatura-imagem" className="mb-1 block text-xs font-semibold text-kmp-text/70">
            Imagem da assinatura
          </label>
          <input
            id="assinatura-imagem"
            type="file"
            name="imagem"
            accept="image/png,image/jpeg,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImagemLocal(f ? URL.createObjectURL(f) : null);
              if (f) setRemover(false);
            }}
            className="w-full text-sm text-kmp-text/70"
          />
          {atual.url ? (
            <label className="mt-1 flex items-center gap-2 text-xs text-kmp-text/70">
              <input
                type="checkbox"
                name="remover_imagem"
                checked={remover}
                onChange={(e) => setRemover(e.target.checked)}
              />
              Remover a imagem atual
            </label>
          ) : null}
        </div>
        <div>
          <label htmlFor="assinatura-fecho" className="mb-1 block text-xs font-semibold text-kmp-text/70">
            Frase antes da assinatura
          </label>
          <input
            id="assinatura-fecho"
            name="fecho"
            value={fecho}
            onChange={(e) => setFecho(e.target.value)}
            placeholder="Atenciosamente,"
            className={campo}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="assinatura-whatsapp" className="mb-1 block text-xs font-semibold text-kmp-text/70">
              WhatsApp (com DDI)
            </label>
            <input
              id="assinatura-whatsapp"
              name="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+61 451 051 806"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="assinatura-instagram" className="mb-1 block text-xs font-semibold text-kmp-text/70">
              Instagram
            </label>
            <input
              id="assinatura-instagram"
              name="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@usuario"
              className={campo}
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-kmp-text/70">Como fica no e-mail</p>
          <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-[#161814]">
            <p className="text-[#161814]/60">(texto da mensagem)</p>
            {fecho.trim() ? <p className="mb-2 mt-4">{fecho.trim()}</p> : null}
            {urlDaPrevia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlDaPrevia} alt="" className="block h-auto w-full max-w-[480px]" />
            ) : null}
            {zap.length >= 8 || insta ? (
              <p className="mt-2 text-[13px] font-semibold text-[#F27B20]">
                {[zap.length >= 8 ? "WhatsApp" : null, insta ? "Instagram" : null].filter(Boolean).join("  ·  ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-full bg-kmp-primary px-5 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar assinatura"}
          </button>
          {state.error ? <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span> : null}
          {state.ok ? <span className="text-sm text-green-700 dark:text-green-400">Assinatura salva.</span> : null}
        </div>
      </form>
    </section>
  );
}
