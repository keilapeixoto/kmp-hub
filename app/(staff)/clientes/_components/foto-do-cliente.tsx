"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { salvarFotoDoCliente } from "../actions";

/** Avatar do cliente: foto (se houver) ou iniciais; clicar troca a foto. */
export function FotoDoCliente({
  clientId,
  fotoUrl,
  iniciais,
}: {
  clientId: string;
  fotoUrl: string | null;
  iniciais: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pendente}
        title="Trocar a foto do cliente"
        className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-white font-heading text-xl font-bold text-kmp-clientes-deep shadow-md sm:h-20 sm:w-20 sm:text-2xl"
      >
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada de curta duração
          <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          iniciais
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          {pendente ? <span className="text-xs">Enviando…</span> : <Camera className="h-5 w-5" />}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (!arquivo) return;
          const fd = new FormData();
          fd.set("foto", arquivo);
          iniciar(async () => {
            const r = await salvarFotoDoCliente(clientId, fd);
            setErro(r.error);
          });
          e.target.value = "";
        }}
      />
      {erro ? <p className="mt-1 max-w-[10rem] text-xs text-white">{erro}</p> : null}
    </div>
  );
}
