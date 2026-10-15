import Link from "next/link";
import { ArrowRight, Check, ClipboardList, FileUp, Mail, MessageCircle, UserRound } from "lucide-react";
import { getPortalCases } from "@/lib/portal/data";
import { getResumosDoPortal, type ResumoProcesso } from "@/lib/portal/resumo";
import { linkWhatsapp } from "@/lib/portal/progresso";
import { CHECKLIST_ITEM_STATUS_LABELS } from "@/lib/checklists/constants";
import { Etiqueta, FaixaTitulo } from "@/components/ui/vivid";
import { PortalHeader } from "./_components/portal-header";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  arquivado: "Concluído",
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

function OQueFalta({ r }: { r: ResumoProcesso }) {
  const formPendente = r.formulario && !r.formulario.enviado;
  const nada = !formPendente && r.pendentes.length === 0;
  return (
    <section className={cartao}>
      <FaixaTitulo titulo="O que falta você fazer" cor="laranja" icon={ClipboardList} />
      {nada ? (
        <p className="flex items-center gap-2 rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/75">
          <Check className="h-4 w-4 text-kmp-processos" /> Nada pendente com você agora. Avisaremos quando
          precisarmos de algo.
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
                  <span className="text-sm font-semibold text-kmp-text">Preencher o formulário de dados</span>
                  <span className="text-sm font-semibold text-kmp-text/70">{r.formulario.percentual}%</span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-kmp-text/10">
                  <span
                    className="block h-full rounded-full bg-kmp-orange"
                    style={{ width: `${r.formulario.percentual}%` }}
                  />
                </span>
                <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-kmp-text/70">
                  {r.formulario.percentual > 0 ? "Continuar de onde parou" : "Começar"} <ArrowRight className="h-3.5 w-3.5" />
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
                  <span className="truncate">Enviar: {item.nome}</span>
                </span>
                <Etiqueta cor={item.status === "rejeitado" || item.status === "reenvio_solicitado" ? "vermelho" : "amarelo"}>
                  {CHECKLIST_ITEM_STATUS_LABELS[item.status] ?? item.status}
                </Etiqueta>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {r.formulario?.enviado ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-kmp-text/70">
          <Check className="h-4 w-4 text-kmp-processos" /> Formulário enviado.{" "}
          <Link href={`/portal/formulario?processo=${r.caseId}`} className="font-semibold underline">
            Ver respostas
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function FaleComConsultora({ r }: { r: ResumoProcesso }) {
  const c = r.consultora;
  const whats = linkWhatsapp(c?.telefone ?? null);
  return (
    <section className={cartao}>
      <FaixaTitulo titulo="Fale com sua consultora" cor="verde" icon={UserRound} />
      {c ? (
        <>
          <p className="font-heading text-lg font-semibold text-kmp-text">{c.nome}</p>
          <p className="text-sm text-kmp-text/70">Responsável pelo seu processo</p>
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
        <p className="text-sm text-kmp-text/70">A equipe da KMP vai entrar em contato com você.</p>
      )}
    </section>
  );
}

export default async function PortalHomePage() {
  const cases = await getPortalCases();
  const resumos = await getResumosDoPortal(cases);
  const nome = primeiroNome(cases[0]?.client_nome ?? "");

  return (
    <>
      <PortalHeader />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-kmp-text">{nome ? `Olá, ${nome}` : "Olá"}</h1>
          <p className="mt-1 text-sm text-kmp-text/70">Acompanhe aqui o andamento do seu processo com a KMP Consulting.</p>
        </div>

        {cases.length === 0 ? (
          <p className={`${cartao} text-center text-sm text-kmp-text/70`}>
            Nenhum processo vinculado à sua conta ainda. Fale com sua consultora se isso não parecer certo.
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-kmp-text/60">Seu processo</p>
                      <h2 className="mt-1 font-heading text-2xl font-semibold text-kmp-text">{r.servico}</h2>
                      {etapaNome ? (
                        <p className="mt-1 text-sm text-kmp-text/75">
                          Etapa atual: <span className="font-semibold text-kmp-text">{etapaNome}</span>
                          {r.etapas.length > 0 ? ` (${r.etapaAtual + 1} de ${r.etapas.length})` : null}
                        </p>
                      ) : null}
                    </div>
                    <Etiqueta cor={c.status === "ativo" ? "verde" : "cinza"}>{STATUS_LABELS[c.status] ?? c.status}</Etiqueta>
                  </div>
                  <Etapas etapas={r.etapas} atual={r.etapaAtual} />
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <OQueFalta r={r} />
                  <FaleComConsultora r={r} />
                </div>
              </div>
            );
          })
        )}
      </main>
    </>
  );
}
