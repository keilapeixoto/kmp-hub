"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { excluirCliente, type ExcluirClienteState } from "../actions";

/** Zona de perigo da aba Dados: só admin, digitando o nome do cliente. */
export function ExcluirCliente({ clientId, nome }: { clientId: string; nome: string }) {
  const [state, acao, pendente] = useActionState<ExcluirClienteState, FormData>(excluirCliente.bind(null, clientId), {
    error: null,
  });
  const [digitado, setDigitado] = useState("");
  const confere = digitado.trim().toLowerCase() === nome.trim().toLowerCase();
  return (
    <details className="rounded-3xl border border-red-200 bg-red-50/60 p-5 dark:border-red-400/30 dark:bg-red-400/10">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
        <Trash2 className="h-4 w-4" /> Excluir cliente
      </summary>
      <form
        action={acao}
        onSubmit={(e) => {
          if (!confirm(`Excluir ${nome} de vez? Isso não pode ser desfeito.`)) e.preventDefault();
        }}
        className="mt-3 space-y-3 text-sm text-red-900 dark:text-red-100"
      >
        <p>
          Apaga de vez o cadastro, os processos, tarefas, notas, o acesso ao portal e os documentos (inclusive os
          arquivos). Não dá para desfazer. Para confirmar, digite o nome: <strong>{nome}</strong>
        </p>
        <input
          name="confirmacao"
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          autoComplete="off"
          className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-kmp-text focus:border-red-500 focus:outline-none"
        />
        {state.error ? <p className="text-red-700 dark:text-red-300">{state.error}</p> : null}
        <button
          type="submit"
          disabled={!confere || pendente}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
        >
          {pendente ? "Excluindo…" : "Excluir de vez"}
        </button>
      </form>
    </details>
  );
}
