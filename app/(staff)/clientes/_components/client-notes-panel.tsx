"use client";

import { useActionState, useRef, useTransition } from "react";
import { Lock, MessageSquareText, Trash2 } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
import { iniciais } from "@/lib/clients/perfil-calc";
import { addClientNote, deleteClientNote, type ClientNoteState } from "../actions";

// Notas internas da equipe no perfil do cliente (o painel de comentários da
// referência visual). Só a equipe vê — o RLS de client_notes nunca libera
// cliente nem parceiro, então nada daqui chega ao portal.

export type NotaParaPainel = {
  id: string;
  autor: string;
  autorNome: string;
  texto: string;
  quando: string;
};

const inicial: ClientNoteState = { error: null, ok: false };

export function ClientNotesPanel({
  clientId,
  notas,
  ativas,
  usuarioId,
  isAdmin,
}: {
  clientId: string;
  notas: NotaParaPainel[];
  ativas: boolean;
  usuarioId: string | null;
  isAdmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [excluindo, startExcluir] = useTransition();
  const [state, formAction, salvando] = useActionState(
    async (prev: ClientNoteState, formData: FormData) => {
      const r = await addClientNote(clientId, prev, formData);
      if (r.ok) formRef.current?.reset();
      return r;
    },
    inicial,
  );

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo
        titulo="Notas da equipe"
        cor="roxo"
        icon={MessageSquareText}
        direita={ativas ? `${notas.length}` : undefined}
      />
      <p className="mb-3 flex items-center gap-1.5 text-xs text-kmp-text/60">
        <Lock className="h-3.5 w-3.5" />
        Só a equipe vê. Nunca aparece no portal do cliente.
      </p>

      {!ativas ? (
        <p className="rounded-2xl bg-kmp-text/5 p-4 text-sm text-kmp-text/70">
          As notas ainda não foram ativadas no banco de dados.
        </p>
      ) : (
        <>
          <form ref={formRef} action={formAction} className="space-y-2">
            <label htmlFor="nota-texto" className="sr-only">
              Nova nota
            </label>
            <textarea
              id="nota-texto"
              name="texto"
              required
              rows={3}
              maxLength={4000}
              placeholder="Escreva uma nota para a equipe…"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-full bg-kmp-primary px-4 py-1.5 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Adicionar nota"}
              </button>
              {state.error ? <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span> : null}
            </div>
          </form>

          {notas.length === 0 ? (
            <p className="mt-4 text-sm text-kmp-text/60">Nenhuma nota ainda.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {notas.map((n) => {
                const podeExcluir = isAdmin || n.autor === usuarioId;
                return (
                  <li key={n.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bd72ae]/20 text-xs font-semibold text-[#6f2c63] dark:text-[#e2bdd9]"
                    >
                      {iniciais(n.autorNome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-kmp-text">{n.autorNome}</p>
                        <span className="shrink-0 text-xs text-kmp-text/50">{n.quando}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line break-words text-sm text-kmp-text/85">{n.texto}</p>
                      {podeExcluir ? (
                        <button
                          type="button"
                          disabled={excluindo}
                          onClick={() => {
                            if (!window.confirm("Excluir esta nota?")) return;
                            startExcluir(() => deleteClientNote(clientId, n.id));
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-kmp-text/50 transition hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
