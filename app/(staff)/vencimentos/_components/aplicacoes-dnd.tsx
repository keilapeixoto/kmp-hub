"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusDaAplicacao } from "../../processos/actions";

// Arrastar e soltar no quadro de Aplicações (out/2026: "não consigo mover de
// um pro outro"). O cartão continua com o seletor de status; arrastar para
// outra coluna faz a mesma coisa.

export function CartaoArrastavel({ caseId, children, className }: { caseId: string; children: React.ReactNode; className: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/case-id", caseId)}
      className={`cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </div>
  );
}

export function ColunaQueRecebe({ status, children, className }: { status: string; children: React.ReactNode; className: string }) {
  const [sobre, setSobre] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const router = useRouter();
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const caseId = e.dataTransfer.getData("text/case-id");
        if (!caseId) return;
        iniciar(async () => {
          const r = await mudarStatusDaAplicacao(caseId, status);
          setErro(r.error);
          router.refresh();
        });
      }}
      className={`${className} ${sobre ? "ring-2 ring-kmp-orange" : ""}`}
    >
      {erro ? <p className="mx-3 mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">{erro}</p> : null}
      {children}
    </section>
  );
}
