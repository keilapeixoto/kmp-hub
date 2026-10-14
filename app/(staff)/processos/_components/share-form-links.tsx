"use client";

import { useState } from "react";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function ShareFormLinks({
  link,
  clientNome,
  clientTelefone,
}: {
  link: string;
  clientNome: string;
  clientEmail: string | null;
  clientTelefone: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const [mensagemCopiada, setMensagemCopiada] = useState(false);

  const mensagem = `Olá ${clientNome}, segue o link do formulário para preenchimento: ${link}`;
  const whatsappHref = `https://wa.me/${clientTelefone ? onlyDigits(clientTelefone) : ""}?text=${encodeURIComponent(mensagem)}`;
  // Texto pronto pra colar no e-mail (a assinatura entra no próprio e-mail da
  // Keila). Antes era um mailto:, que só abre com app de e-mail configurado.
  const mensagemEmail = `Olá ${clientNome},

Segue o link para preencher o formulário de dados do seu processo:
${link}

Ao abrir o link, informe seu e-mail para receber o acesso ao portal.

Qualquer dúvida, estou à disposição.`;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-text transition hover:bg-kmp-orange hover:text-white"
      >
        {copiado ? "Copiado!" : "Copiar link"}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-text transition hover:bg-kmp-orange hover:text-white"
      >
        WhatsApp
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(mensagemEmail);
          setMensagemCopiada(true);
          setTimeout(() => setMensagemCopiada(false), 2000);
        }}
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-text transition hover:bg-kmp-orange hover:text-white"
      >
        {mensagemCopiada ? "Copiado!" : "Copiar mensagem"}
      </button>
    </div>
  );
}
