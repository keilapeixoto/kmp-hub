"use client";

import { useActionState, useMemo, useState } from "react";
import { PenLine } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import { htmlDaAssinatura, type DadosDaAssinatura } from "@/lib/email/assinatura";
import { salvarAssinatura, type AssinaturaState } from "../actions";

// Assinatura de e-mail de quem está logado: vai só no fim dos e-mails enviados
// pelo Hub (perfil do cliente → Enviar e-mail). Cartão com foto, cargo,
// contatos e botões; a prévia é o mesmo HTML que vai no e-mail.

const inicial: AssinaturaState = { error: null, ok: false };
const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const rotulo = "mb-1 block text-xs font-semibold text-kmp-text/70";

export function SignatureForm({ atual }: { atual: DadosDaAssinatura }) {
  const [state, formAction, salvando] = useActionState(salvarAssinatura, inicial);
  const c = atual.cartao;
  const [v, setV] = useState({
    fecho: atual.fecho ?? "",
    whatsapp: atual.whatsapp ?? "",
    instagram: atual.instagram ?? "",
    cargo: c?.cargo ?? "",
    credencial: c?.credencial ?? "",
    slogan: c?.slogan ?? "",
    telefone: c?.telefone ?? "",
    email: c?.email ?? "",
    aviso: c?.aviso ?? "",
  });
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [logoLocal, setLogoLocal] = useState<string | null>(null);
  const muda = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((a) => ({ ...a, [k]: e.target.value }));

  // Prévia: o mesmo HTML do e-mail (imagens locais ainda não enviadas aparecem por blob:).
  const previa = useMemo(() => {
    const html = htmlDaAssinatura({
      url: atual.url,
      fecho: v.fecho,
      whatsapp: v.whatsapp,
      instagram: v.instagram,
      nome: atual.nome,
      cartao: {
        cargo: v.cargo,
        credencial: v.credencial,
        slogan: v.slogan,
        telefone: v.telefone,
        email: v.email,
        aviso: v.aviso,
        fotoUrl: fotoLocal ? "https://previa/foto" : (c?.fotoUrl ?? null),
        logoUrl: logoLocal ? "https://previa/logo" : (c?.logoUrl ?? null),
        baseUrl: typeof window === "undefined" ? (c?.baseUrl ?? "") : window.location.origin,
      },
    });
    return html
      .replace("https://previa/foto", fotoLocal ?? "")
      .replace("https://previa/logo", logoLocal ?? "");
  }, [v, fotoLocal, logoLocal, atual.url, atual.nome, c]);

  const texto = (k: keyof typeof v, label: string, placeholder = "", larga = false) => (
    <div className={larga ? "sm:col-span-2" : ""}>
      <label htmlFor={`assinatura-${k}`} className={rotulo}>
        {label}
      </label>
      <input id={`assinatura-${k}`} name={k} value={v[k]} onChange={muda(k)} placeholder={placeholder} className={campo} />
    </div>
  );

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Assinatura de e-mail" cor="laranja" icon={PenLine} />
      <p className="mb-4 text-sm text-kmp-text/70">
        Vai só no fim dos e-mails que você manda pelo Hub. Telefone, e-mail, Instagram e os botões ficam clicáveis.
      </p>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {texto("cargo", "Cargo", "Founder & Strategic Education Consultant", true)}
          {texto("credencial", "Credencial / registro", "QEAC #09831 - Certified Qualified Education Agent", true)}
          {texto("slogan", "Frase de destaque", "Strategy that connects. Future that transforms.", true)}
          {texto("telefone", "Telefone", "+61 451 051 806")}
          {texto("email", "E-mail", "nome@empresa.com.au")}
          {texto("whatsapp", "WhatsApp (com DDI)", "+61 451 051 806")}
          {texto("instagram", "Instagram", "@usuario")}
          {texto("fecho", "Frase antes da assinatura", "Atenciosamente,", true)}
          <div className="sm:col-span-2">
            <label htmlFor="assinatura-aviso" className={rotulo}>
              Aviso no rodapé
            </label>
            <textarea
              id="assinatura-aviso"
              name="aviso"
              rows={2}
              value={v.aviso}
              onChange={muda("aviso")}
              placeholder="Este email e quaisquer anexos são confidenciais e destinados exclusivamente ao destinatário."
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="assinatura-foto" className={rotulo}>
              Sua foto (quadrada, PNG ou JPG)
            </label>
            <input
              id="assinatura-foto"
              type="file"
              name="foto"
              accept="image/png,image/jpeg,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFotoLocal(f ? URL.createObjectURL(f) : null);
              }}
              className="w-full text-sm text-kmp-text/70"
            />
          </div>
          <div>
            <label htmlFor="assinatura-logo" className={rotulo}>
              Logo da empresa (PNG ou JPG)
            </label>
            <input
              id="assinatura-logo"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setLogoLocal(f ? URL.createObjectURL(f) : null);
              }}
              className="w-full text-sm text-kmp-text/70"
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-kmp-text/70">Como fica no e-mail</p>
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white p-4 text-sm text-[#161814]">
            <p className="text-[#161814]/60">(texto da mensagem)</p>
            {/* HTML montado por htmlDaAssinatura: todo texto já vem escapado. */}
            <div dangerouslySetInnerHTML={{ __html: previa }} />
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
