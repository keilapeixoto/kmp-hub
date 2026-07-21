"use client";

import { useState } from "react";

/**
 * Nome de exibição de um documento, com opção de renomear. `nome` é a
 * exibição atual (já resolvida: nome customizado ou nome do arquivo
 * enviado); `onRename` é a Server Action que grava o novo nome.
 */
export function DocumentNameEditor({
  nome,
  href,
  archived,
  onRename,
}: {
  nome: string;
  href: string | null;
  archived: boolean;
  onRename: (formData: FormData) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={(formData) => {
          onRename(formData);
          setEditing(false);
        }}
        className="flex min-w-0 flex-1 items-center gap-1.5"
      >
        <input
          type="text"
          name="nome"
          defaultValue={nome}
          autoFocus
          className="min-w-0 flex-1 rounded border border-black/10 px-1.5 py-0.5 text-xs"
        />
        <button
          type="submit"
          className="shrink-0 text-xs font-medium text-kmp-orange"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 text-xs text-kmp-graphite/40"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-kmp-graphite hover:text-kmp-orange"
        >
          {nome}
        </a>
      ) : (
        <span className="min-w-0 truncate">
          {nome} {archived ? "(arquivado)" : null}
        </span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-xs text-kmp-graphite/40 hover:text-kmp-orange"
      >
        Renomear
      </button>
    </span>
  );
}
