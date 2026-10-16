"use client";

import { useActionState, useState } from "react";
import { pedirAoCliente, type PedidoState } from "../pedidos-actions";

const inputClass =
  "mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

/** "Pedir ao cliente": documento extra ou tradução, com alerta por e-mail. */
export function PedidoAoCliente({ caseId, documentos }: { caseId: string; documentos: string[] }) {
  const [state, formAction, pending] = useActionState<PedidoState, FormData>(pedirAoCliente.bind(null, caseId), {
    erro: null,
    ok: null,
  });
  const [tipo, setTipo] = useState<"documento" | "traducao">("documento");

  return (
    <details className="rounded-3xl bg-kmp-surface p-4 shadow-sm" open={Boolean(state.erro)}>
      <summary className="cursor-pointer text-sm font-medium text-kmp-text">Pedir ao cliente</summary>
      <form action={formAction} className="mt-4 space-y-3">
        <div className="flex gap-2 text-sm">
          {(["documento", "traducao"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-full px-3 py-1 ${tipo === t ? "bg-kmp-primary text-kmp-on-primary" : "bg-kmp-text/5 text-kmp-text"}`}
            >
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "documento" ? "Documento" : "Tradução juramentada"}
            </label>
          ))}
        </div>
        <div>
          <label htmlFor={`documento-${caseId}`} className="block text-sm font-medium text-kmp-text">
            {tipo === "traducao" ? "Tradução de qual documento?" : "Qual documento?"}
          </label>
          <input
            id={`documento-${caseId}`}
            name="documento"
            required
            list={`docs-${caseId}`}
            placeholder={tipo === "traducao" ? "Certidão de casamento" : "Carta convite assinada"}
            className={inputClass}
          />
          <datalist id={`docs-${caseId}`}>
            {documentos.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={`instrucoes-${caseId}`} className="block text-sm font-medium text-kmp-text">
            Instruções para o cliente
          </label>
          <textarea
            id={`instrucoes-${caseId}`}
            name="instrucoes"
            rows={2}
            maxLength={500}
            placeholder={tipo === "traducao" ? "Tradução juramentada para o inglês, com o carimbo do tradutor." : ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor={`prazo-${caseId}`} className="block text-sm font-medium text-kmp-text">
              Prazo
            </label>
            <input id={`prazo-${caseId}`} name="prazo" type="date" className={inputClass} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-kmp-text">
            <input type="checkbox" name="avisar" defaultChecked />
            Avisar o cliente por e-mail
          </label>
        </div>
        {state.erro ? <p className="text-sm text-red-700">{state.erro}</p> : null}
        {state.ok ? <p className="text-sm text-emerald-700">{state.ok}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Fazer o pedido"}
        </button>
      </form>
    </details>
  );
}
