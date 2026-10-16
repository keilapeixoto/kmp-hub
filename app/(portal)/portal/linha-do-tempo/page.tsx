import { Check, History, Route } from "lucide-react";
import { getPortalCases } from "@/lib/portal/data";
import { getResumosDoPortal } from "@/lib/portal/resumo";
import { createClient } from "@/lib/supabase/server";
import { FaixaTitulo } from "@/components/ui/vivid";
import { PortalHeader } from "../_components/portal-header";
import { getIdiomaDoPortal } from "@/lib/portal/idioma";
import { tradutor } from "@/lib/portal/i18n";

const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm";

const quando = (iso: string, idioma: string) =>
  new Intl.DateTimeFormat(idioma === "en" ? "en-AU" : "pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Australia/Sydney" }).format(
    new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso),
  );

// Linha do tempo do cliente: as fases do processo (a equipe muda a fase no
// perfil do cliente / Pipeline) e o histórico do que já aconteceu.
export default async function PortalLinhaDoTempoPage() {
  const cases = await getPortalCases();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const idioma = await getIdiomaDoPortal();
  const t = tradutor(idioma);
  const resumos = await getResumosDoPortal(cases, user?.id ?? null, idioma);

  return (
    <>
      <PortalHeader idioma={idioma} />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-kmp-text">{t("linha.titulo")}</h1>
          <p className="mt-1 text-sm text-kmp-text/70">
            {t("linha.sub")}
          </p>
        </div>

        {resumos.length === 0 ? (
          <p className={`${cartao} text-center text-sm text-kmp-text/70`}>{t("linha.semProcesso")}</p>
        ) : null}

        {resumos.map((r) => (
          <div key={r.caseId} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className={cartao}>
              <FaixaTitulo titulo={t("linha.fasesDe", { servico: r.servico })} cor="laranja" icon={Route} />
              {r.recado ? (
                <p className="mb-4 rounded-2xl bg-[#f27b20]/12 p-4 text-sm text-kmp-text">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-kmp-text/60">
                    {t("linha.recadoEm", { data: quando(r.recado.created_at, idioma) })}
                  </span>
                  {r.recado.mensagem}
                </p>
              ) : null}
              {r.etapas.length === 0 ? (
                <p className="text-sm text-kmp-text/70">{t("linha.fasesVazio")}</p>
              ) : (
                <ol className="space-y-2">
                  {r.etapas.map((nome, i) => {
                    const feita = r.etapaAtual >= 0 && i < r.etapaAtual;
                    const agora = i === r.etapaAtual;
                    return (
                      <li
                        key={nome + i}
                        className={`flex items-center gap-3 rounded-2xl p-3 ${agora ? "bg-[#f27b20]/15" : "bg-kmp-text/5"}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            feita
                              ? "bg-kmp-processos text-white"
                              : agora
                                ? "bg-kmp-orange text-white"
                                : "bg-white/80 text-kmp-text/60 dark:bg-white/10"
                          }`}
                        >
                          {feita ? <Check className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm ${agora ? "font-bold text-kmp-text" : feita ? "font-semibold text-kmp-text" : "text-kmp-text/70"}`}>
                            {nome}
                          </span>
                          <span className="block text-xs text-kmp-text/60">
                            {feita ? t("linha.concluida") : agora ? t("linha.faseAtual") : t("linha.proxima")}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className={cartao}>
              <FaixaTitulo titulo={t("linha.aconteceu")} cor="azul" icon={History} />
              {r.linhaDoTempo.length === 0 ? (
                <p className="text-sm text-kmp-text/70">{t("linha.nada")}</p>
              ) : (
                <ol className="relative ml-2 space-y-4 border-l-2 border-kmp-divider pl-5">
                  {r.linhaDoTempo.map((e, i) => (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white/70 dark:ring-white/10 ${
                          i === 0 ? "bg-kmp-orange" : "bg-kmp-text/30"
                        }`}
                      />
                      {e.tipo === "recado" ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-kmp-text/60">{t("inicio.recado")}</p>
                      ) : null}
                      <p className="text-sm font-semibold text-kmp-text">{e.titulo}</p>
                      <p className="text-xs text-kmp-text/60">{quando(e.data, idioma)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ))}
      </main>
    </>
  );
}
