import Link from "next/link";
import { AlertTriangle, Calendar } from "lucide-react";
import type { GoogleDaySummary } from "@/lib/google/dashboard";
import { GmailLogo, GoogleLogo } from "@/app/(staff)/_components/brand-icons";

function formatHora(iso: string, diaInteiro: boolean) {
  if (diaInteiro || !iso) return "Dia todo";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleDaySummaryCard({ summary }: { summary: GoogleDaySummary }) {
  if (!summary.connected) {
    return (
      <div className="rounded-2xl bg-kmp-surface p-5 shadow-sm dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20">
        <h2 className="font-heading text-lg text-kmp-text">
          Agenda e e-mail do Google
        </h2>
        <p className="mt-1 text-sm text-kmp-text/50">
          Conecte sua conta Google pra ver sua agenda real e e-mails não
          lidos aqui.
        </p>
        <Link
          href="/configuracoes/integracoes"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
        >
          <GoogleLogo className="h-4 w-4" />
          Conectar Google
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-kmp-surface p-5 shadow-sm dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep dark:shadow-md dark:shadow-kmp-config/20">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-kmp-text">
          Agenda e e-mail de hoje
        </h2>
        {summary.erro ? (
          <span className="text-xs text-orange-800">{summary.erro}</span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/40">
            <Calendar className="h-3.5 w-3.5" />
            Compromissos (Google Calendar)
          </div>
          {summary.eventos.length === 0 ? (
            <p className="mt-2 text-sm text-kmp-text/50">
              Nada na sua agenda do Google hoje.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {summary.eventos.map((ev) => (
                <li key={ev.id} className="text-sm">
                  {ev.link ? (
                    <a
                      href={ev.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-kmp-text hover:text-kmp-orange"
                    >
                      <span className="font-medium">{ev.titulo}</span>
                    </a>
                  ) : (
                    <span className="font-medium text-kmp-text">{ev.titulo}</span>
                  )}
                  <p className="text-xs text-kmp-text/40">
                    {formatHora(ev.inicio, ev.diaInteiro)}
                    {ev.local ? ` · ${ev.local}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/40">
            <GmailLogo className="h-3.5 w-3.5" />
            Gmail
          </div>
          <p className="mt-2 text-sm text-kmp-text">
            <span className="font-heading text-xl font-extrabold">
              {summary.totalNaoLidos}
            </span>{" "}
            não lido{summary.totalNaoLidos === 1 ? "" : "s"}
          </p>
          {summary.mensagensUrgentes.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {summary.mensagensUrgentes.map((m) => (
                <li key={m.id} className="flex items-start gap-1.5 text-sm">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-800" />
                  <div>
                    <p className="font-medium text-kmp-text">{m.assunto}</p>
                    <p className="text-xs text-kmp-text/40">{m.de}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-kmp-text/40">
              Nenhuma marcada como importante pelo Gmail.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
