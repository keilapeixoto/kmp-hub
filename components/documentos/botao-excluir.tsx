"use client";

import { Trash2 } from "lucide-react";

// "Excluir" no Hub = arquivar (soft delete, convenção do projeto): o arquivo
// some das listas e vai para "Arquivados", onde só admin vê e pode restaurar.
export function BotaoExcluir({
  nome,
  action,
  definitivo = false,
}: {
  nome: string;
  action: () => void | Promise<void>;
  /** exclusão definitiva (só admin, em Arquivados): apaga o arquivo de vez */
  definitivo?: boolean;
}) {
  const aviso = definitivo
    ? `Excluir "${nome}" DEFINITIVAMENTE?\n\nO arquivo é apagado de vez e não pode ser recuperado.`
    : `Excluir "${nome}"?\n\nO arquivo sai da lista e vai para Arquivados (só admin vê e pode restaurar).`;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(aviso)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label={definitivo ? `Excluir ${nome} definitivamente` : `Excluir ${nome}`}
        title={definitivo ? "Excluir definitivamente" : "Excluir (vai para Arquivados)"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-kmp-text/70 transition hover:bg-[#fde2e5] hover:text-[#9a2433]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
