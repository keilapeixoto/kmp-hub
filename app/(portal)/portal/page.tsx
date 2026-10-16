import Link from "next/link";
import { ArrowRight, Check, ClipboardList, FileUp, Mail, MessageCircle, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalCases } from "@/lib/portal/data";
import { getResumosDoPortal, type ResumoProcesso } from "@/lib/portal/resumo";
import { linkWhatsapp } from "@/lib/portal/progresso";
import { CHECKLIST_ITEM_STATUS_LABELS } from "@/lib/checklists/constants";
import { Etiqueta, FaixaTitulo } from "@/components/ui/vivid";
import { PortalHeader } from "./_components/portal-header";
import { getIdiomaDoPortal } from "@/lib/portal/idioma";
import { STATUS_ITEM_EN, tradutor, type Chave, type Idioma } from "@/lib/portal/i18n";

const STATUS_CHAVE: Record<string, Chave> = {
  ativo: "status.ativo",
  pausado: "status.pausado",
  concluido: "status.concluido",
  cancelado: "status.cancelado",
  arquivado: "status.concluido",
};

const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm";

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? "";
}

function Etapas({ etapas, atual }: { etapas: string[]; atual: number }) {
  if (etapas.length === 0) return null;
  return (
    <ol className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}>
      {etapas.map((nome, i) => {
        const feita = atual >= 0 && i < atual;
        const agora = i === atual;
        return (
          <li key={nome + i} className="min-w-0">
            <div
              className={`h-2 rounded-full ${
                feita ? "bg-kmp-processos" : agora ? "bg-kmp-orange" : "bg-kmp-text/10"
              }`}
            />
            <p
              className={`mt-2 hidden text-xs leading-tight sm:block ${
                agora ? "font-semibold text-kmp-text" : "text-kmp-text/60"
              }`}
            >
              {nome}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function OQueFalta({ r, idioma }: { r: ResumoProcesso; idioma: Idioma }) {
  const t = tradutor(idioma);
  const rotuloStatus = (s: string) => (idioma === "en" ? STATUS_ITEM_EN[s] : CHECKLIST_ITEM_STATUS_LABELS[s]) ?? s;
  const formPendente = r.formulario && !r.formulario.enviado;
  const nada = !formPendente && r.pendentes.length === 0;
  return (
    <section className={cartao}>
      <FaixaTitulo titulo={t("falta.titulo")} cor="laranja" icon={ClipboardList} />
      {nada ? (
        <p className="flex items-center gap-2 rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/75">
          <Check className="h-4 w-4 text-kmp-processos" /> {t("falta.nada")}
        </p>
      ) : (
        <ul className="space-y-2">
          {formPendente && r.formulario ? (
            <li>
              <Link
                href={`/portal/formulario?processo=${r.caseId}`}
                className="block rounded-2xl bg-kmp-text/5 p-4 transition hover:bg-kmp-text/10"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-kmp-text">{t("falta.formulario")}</span>
                  <span className="text-sm font-semibold text-kmp-text/70">{r.formulario.percentual}%</span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-kmp-text/10">
                  <span
                    className="block h-full rounded-full bg-kmp-orange"
                    style={{ width: `${r.formulario.percentual}%` }}
                  />
                </span>
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-kmp-text/70">
                  {r.formulario.percentual > 0 ? t("falta.continuar") : t("falta.comecar")} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ) : null}
          {r.pendentes.map((item) => (
            <li key={item.id}>
              <Link
                href={`/portal/documentos?processo=${r.caseId}#item-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-kmp-text/5 p-4 transition hover:bg-kmp-text/10"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-kmp-text">
                  <FileUp className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("falta.enviar", { nome: item.nome })}</span>
                </span>
                <Etiqueta cor={item.status === "rejeitado" || item.status === "reenvio_solicitado" ? "vermelho" : "amarelo"}>
                  {rotuloStatus(item.status)}
                </Etiqueta>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {r.formulario?.enviado ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-kmp-text/70">
          <Check className="h-4 w-4 text-kmp-processos" /> {t("falta.formEnviado")}{" "}
          <Link href={`/portal/formulario?processo=${r.caseId}`} className="font-semibold underline">
            {t("falta.verRespostas")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function FaleComConsultora({ r, idioma }: { r: ResumoProcesso; idioma: Idioma }) {
  const t = tradutor(idioma);
  const c = r.consultora;
  const whats = linkWhatsapp(c?.telefone ?? null);
  return (
    <section className={cartao}>
      <FaixaTitulo titulo={t("consultora.titulo")} cor="verde" icon={UserRound} />
      {c ? (
        <>
          <p className="font-heading text-lg font-semibold text-kmp-text">{c.nome}</p>
          <p className="text-sm text-kmp-text/70">{t("consultora.responsavel")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {whats ? (
              <a
                href={whats}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-kmp-primary px-4 py-2 text-sm font-semibold text-kmp-on-primary transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            ) : null}
            {c.email ? (
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-kmp-text/5 px-4 py-2 text-sm font-semibold text-kmp-text transition hover:bg-kmp-text/10"
              >
                <Mail className="h-4 w-4" /> E-mail
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-kmp-text/70">{t("consultora.semContato")}</p>
      )}
    </section>
  );
}

export default async function PortalHomePage() {
  const cases = await getPortalCases();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const idioma = await getIdiomaDoPortal();
  const t = tradutor(idioma);
  const resumos = await getResumosDoPortal(cases, user?.id ?? null, idioma);
  const nome = primeiroNome(cases[0]?.client_nome ?? "");

  return (
    <>
      <PortalHeader idioma={idioma} />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-kmp-text">{nome ? t("inicio.olaNome", { nome }) : t("inicio.ola")}</h1>
          <p className="mt-1 text-sm text-kmp-text/70">{t("inicio.sub")}</p>
        </div>

        {cases.length === 0 ? (
          <p className={`${cartao} text-center text-sm text-kmp-text/70`}>
            {t("inicio.semProcesso")}
          </p>
        ) : (
          resumos.map((r, i) => {
            const c = cases[i];
            const etapaNome = r.etapaAtual >= 0 ? r.etapas[r.etapaAtual] : null;
            return (
              <div key={r.caseId} className="space-y-6">
                <section className={cartao}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-kmp-text/60">{t("inicio.seuProcesso")}</p>
                      <h2 className="mt-1 font-heading text-2xl font-semibold text-kmp-text">{r.servico}</h2>
                      {etapaNome ? (
                        <p className="mt-1 text-sm text-kmp-text/75">
                          {t("inicio.etapaAtual")} <span className="font-semibold text-kmp-text">{etapaNome}</span>
                          {r.etapas.length > 0 ? ` ${t("inicio.deTotal", { n: r.etapaAtual + 1, total: r.etapas.length })}` : null}
                        </p>
                      ) : null}
                    </div>
                    <Etiqueta cor={c.status === "ativo" ? "verde" : "cinza"}>{STATUS_CHAVE[c.status] ? t(STATUS_CHAVE[c.status]) : c.status}</Etiqueta>
                  </div>
                  <Etapas etapas={r.etapas} atual={r.etapaAtual} />
                  {r.recado ? (
                    <p className="mt-5 rounded-2xl bg-[#f27b20]/12 p-4 text-sm text-kmp-text">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-kmp-text/60">
                        {t("inicio.recado")}
                      </span>
                      {r.recado.mensagem}
                    </p>
                  ) : null}
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <OQueFalta r={r} idioma={idioma} />
                  <FaleComConsultora r={r} idioma={idioma} />
                </div>
                {r.linhaDoTempo.length > 0 ? (
                  <Link
                    href="/portal/linha-do-tempo"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/75 hover:text-kmp-text"
                  >
                    {t("inicio.verLinha")} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            );
          })
        )}
      </main>
    </>
  );
}
