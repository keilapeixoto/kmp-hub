"use client";

import { useState, useTransition } from "react";
import { generateExtensionToken, revokeExtensionTokenAction } from "../actions";

export function ExtensionTokenCard({
  info,
}: {
  info: { rotulo: string | null; createdAt: string } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateExtensionToken();
      setFreshToken(result.token);
      setCopied(false);
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      await revokeExtensionTokenAction();
      setFreshToken(null);
    });
  }

  async function handleCopy() {
    if (!freshToken) return;
    await navigator.clipboard.writeText(freshToken);
    setCopied(true);
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="font-heading text-lg text-kmp-graphite">
        Extensão ImmiAccount
      </h2>
      <p className="mt-1 text-sm text-kmp-graphite/60">
        Token pra extensão de navegador se conectar ao Hub e buscar o
        código de autenticação do ImmiAccount no seu Gmail.
      </p>

      {freshToken ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">
            Copie agora — ele não aparece de novo depois de sair desta tela.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1.5 text-xs text-kmp-graphite">
              {freshToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md bg-kmp-orange px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      ) : info ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-kmp-graphite/60">
            Token ativo desde{" "}
            {new Date(info.createdAt).toLocaleDateString("pt-BR")}.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRevoke}
            className="shrink-0 rounded-md border border-kmp-graphite/20 px-4 py-2 text-sm font-medium text-kmp-graphite transition hover:bg-kmp-graphite/5 disabled:opacity-50"
          >
            {isPending ? "Revogando..." : "Revogar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="mt-4 rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Gerando..." : "Gerar token"}
        </button>
      )}
    </div>
  );
}
