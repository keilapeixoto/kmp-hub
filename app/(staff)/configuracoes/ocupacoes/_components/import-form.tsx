"use client";

import { useActionState } from "react";
import { importOccupationsCsv, type ImportOccupationsState } from "../actions";

const initialState: ImportOccupationsState = { error: null, resultado: null };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importOccupationsCsv,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="arquivo" className="block text-sm font-medium text-kmp-graphite">
          Arquivo CSV
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label htmlFor="conteudo" className="block text-sm font-medium text-kmp-graphite">
          Ou cole o conteúdo do CSV
        </label>
        <textarea
          id="conteudo"
          name="conteudo"
          rows={10}
          placeholder="nome,codigo_anzsco,categoria,autoridade_avaliadora,nivel_habilidade,na_csol,na_mltssl_legada,fonte"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
        />
        <p className="mt-1 text-xs text-kmp-graphite/50">
          Colunas de visto (opcionais): visto_189, visto_190, visto_491,
          visto_482, visto_494, visto_186, visto_407, visto_485. Aceitam
          sim/não (ou true/false); em branco fica como &quot;não
          informado&quot;. Sem essas colunas, os vistos de linhas já
          existentes não são alterados.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {state.resultado ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.resultado.criadas} criada(s), {state.resultado.atualizadas}{" "}
          atualizada(s)
          {state.resultado.ignoradas > 0
            ? `, ${state.resultado.ignoradas} linha(s) ignorada(s) por erro`
            : ""}
          .
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
