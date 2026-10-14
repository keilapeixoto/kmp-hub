import Link from "next/link";
import { ArrowUpRight, CalendarDays, Mail, Star } from "lucide-react";
import type { GoogleDaySummary } from "@/lib/google/dashboard";
import type { GoogleCalendarEvent } from "@/lib/google/calendar";
import {
  agruparPorDia,
  diasComEvento,
  horaDoEvento,
  iniciais,
  nomeRemetente,
  quandoRecebido,
  semana,
} from "@/lib/google/visual";
import { FaixaTitulo, SUAVE, type CorViva } from "@/components/ui/vivid";
import { GoogleLogo } from "@/app/(staff)/_components/brand-icons";

// Fuso usado para "hoje"/"amanhã" (o servidor da Vercel roda em UTC). A KMP
// opera a partir da Austrália.
const FUSO = "Australia/Sydney";

const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm";
const CORES_AVATAR: CorViva[] = ["azul", "turquesa", "lilas", "verde", "amarelo", "rosa", "roxo", "laranja"];

function corDoNome(nome: string): CorViva {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES_AVATAR[h % CORES_AVATAR.length];
}

function ListaDoDia({ titulo, eventos }: { titulo: string; eventos: GoogleCalendarEvent[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kmp-text/60">{titulo}</p>
      {eventos.length === 0 ? (
        <p className="rounded-2xl bg-kmp-text/5 px-3 py-2 text-sm text-kmp-text/60">Nada marcado.</p>
      ) : (
        <ul className="space-y-1.5">
          {eventos.map((e) => (
            <li key={e.id}>
              <a
                href={e.link ?? "https://calendar.google.com"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-kmp-text/5"
              >
                <span className={`w-16 shrink-0 rounded-full px-2 py-1 text-center text-xs font-semibold ${SUAVE.lilas}`}>
                  {horaDoEvento(e, FUSO)}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-kmp-text">{e.titulo}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AgendaCard({ eventos }: { eventos: GoogleCalendarEvent[] }) {
  const agora = new Date();
  const dias = semana(agora, FUSO);
  const comEvento = diasComEvento(eventos, FUSO);
  const g = agruparPorDia(eventos, agora, FUSO);
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: FUSO }).format(agora);
  return (
    <section className={cartao}>
      <FaixaTitulo titulo="Agenda" cor="lilas" icon={CalendarDays} direita={<span className="capitalize">{mes}</span>} />

      <div className="grid grid-cols-7 gap-1.5">
        {dias.map((d) => (
          <div
            key={d.data}
            className={`flex flex-col items-center rounded-2xl py-2 ${
              d.hoje ? "bg-kmp-primary text-kmp-on-primary shadow-sm" : "bg-kmp-text/5 text-kmp-text"
            }`}
          >
            <span className={`text-[11px] font-semibold capitalize ${d.hoje ? "" : "text-kmp-text/60"}`}>{d.semana}</span>
            <span className="font-heading text-lg font-bold leading-tight">{d.dia}</span>
            <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${comEvento.has(d.data) ? "bg-[#f0c040]" : "bg-transparent"}`} />
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <ListaDoDia titulo="Hoje" eventos={g.hoje} />
        <ListaDoDia titulo="Amanhã" eventos={g.amanha} />
        {g.depois.length > 0 ? <ListaDoDia titulo="Próximos dias" eventos={g.depois.slice(0, 4)} /> : null}
      </div>

      <a
        href="https://calendar.google.com"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/80 hover:text-kmp-text"
      >
        Abrir Google Agenda <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  );
}

function EmailCard({ summary }: { summary: GoogleDaySummary }) {
  const agora = new Date();
  return (
    <section className={cartao}>
      <FaixaTitulo
        titulo="E-mail"
        cor="vermelho"
        icon={Mail}
        direita={`${summary.totalNaoLidos}${summary.maisNaoLidos ? "+" : ""} não lidos na Principal`}
      />

      {summary.mensagens.length === 0 ? (
        <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">Caixa Principal em dia.</p>
      ) : (
        <ul className="divide-y divide-kmp-divider">
          {summary.mensagens.map((m) => {
            const nome = nomeRemetente(m.de);
            return (
              <li key={m.id}>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${m.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-kmp-text/5"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${SUAVE[corDoNome(nome)]}`}
                  >
                    {iniciais(nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-kmp-text">{nome}</span>
                      <span className="shrink-0 text-xs font-medium text-kmp-text/60">
                        {quandoRecebido(m.recebidoEm, agora, FUSO)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {m.importante ? (
                        <Star aria-label="Importante" className="h-3.5 w-3.5 shrink-0 fill-[#f0c040] text-[#d6a419]" />
                      ) : null}
                      <span className="truncate text-sm text-kmp-text">{m.assunto}</span>
                    </span>
                    <span className="block truncate text-xs text-kmp-text/60">{m.trecho}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <a
        href="https://mail.google.com/mail/u/0/#inbox"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/80 hover:text-kmp-text"
      >
        Abrir Gmail <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  );
}

export function GoogleDaySummaryCard({ summary }: { summary: GoogleDaySummary }) {
  if (!summary.connected) {
    return (
      <div className={cartao}>
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-kmp-text">
          <CalendarDays className="h-5 w-5" /> Agenda e e-mail
        </h2>
        <p className="mt-2 text-sm text-kmp-text/70">
          Conecte sua conta Google para ver sua agenda real e seus e-mails não lidos aqui.
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <AgendaCard eventos={summary.eventos} />
      <EmailCard summary={summary} />
      {summary.erro ? <p className="text-xs text-kmp-text/60 lg:col-span-2">{summary.erro}</p> : null}
    </div>
  );
}
