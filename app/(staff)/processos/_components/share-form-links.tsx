"use client";

import { useState } from "react";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function ShareFormLinks({
  link,
  clientNome,
  clientEmail,
  clientTelefone,
}: {
  link: string;
  clientNome: string;
  clientEmail: string | null;
  clientTelefone: string | null;
}) {
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Olá ${clientNome}, segue o link do formulário para preenchimento: ${link}`;
  const whatsappHref = `https://wa.me/${clientTelefone ? onlyDigits(clientTelefone) : ""}?text=${encodeURIComponent(mensagem)}`;
  const emailHref = `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent("Formulário KMP Consulting")}&body=${encodeURIComponent(mensagem)}`;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
      >
        {copiado ? "Copiado!" : "Copiar link"}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
      >
        WhatsApp
      </a>
      <a
        href={emailHref}
        className="rounded-md bg-kmp-graphite/10 px-2.5 py-1 font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
      >
        E-mail
      </a>
    </div>
  );
}
