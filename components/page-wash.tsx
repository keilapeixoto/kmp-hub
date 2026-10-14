"use client";

import { usePathname } from "next/navigation";

// Fundo com mistura de cores suaves, como nas referências (redesign âmbar,
// out/2026): a cor da aba no canto, um cinza-azulado frio e um creme quente
// se misturando. Só decoração: fica atrás de tudo e não recebe clique.
const TONS: [string, string][] = [
  ["/leads", "#bfe3ea"],
  ["/clientes", "#d9d2fa"],
  ["/processos", "#c9ead5"],
  ["/agenda", "#f8e3a8"],
  ["/tarefas", "#f8e3a8"],
  ["/vencimentos", "#f5ccd2"],
  ["/financeiro", "#f6cfdf"],
  ["/ferramentas", "#f6cfdf"],
  ["/documentos", "#ead0e6"],
  ["/guias", "#ead0e6"],
  ["/templates", "#ead0e6"],
  ["/ocupacoes", "#ead0e6"],
  ["/configuracoes", "#cfdcf5"],
];
const AMBAR = "#f9dc95";
const FRIO = "#c7cad1";

export function PageWash() {
  const pathname = usePathname();
  const cor = TONS.find(([prefixo]) => pathname.startsWith(prefixo))?.[1] ?? AMBAR;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#d6d7db_0%,#dfe0e3_40%,#e8e7e2_68%,#f2e2ae_100%)] dark:hidden" />
      <div
        className="absolute -right-32 -top-40 h-[40rem] w-[40rem] rounded-full opacity-45 blur-3xl transition-colors duration-700 dark:hidden"
        style={{ backgroundColor: cor }}
      />
      <div
        className="absolute -bottom-48 -left-32 h-[36rem] w-[36rem] rounded-full opacity-80 blur-3xl dark:hidden"
        style={{ backgroundColor: FRIO }}
      />
      {/* Modo escuro: manchas esmeralda e um toque violeta (referência). */}
      <div className="absolute -left-40 top-1/4 hidden h-[36rem] w-[36rem] rounded-full bg-[#1d5a45] opacity-50 blur-3xl dark:block" />
      <div className="absolute -right-32 -top-32 hidden h-[32rem] w-[32rem] rounded-full bg-[#14463a] opacity-60 blur-3xl dark:block" />
      <div className="absolute -bottom-40 right-1/4 hidden h-[28rem] w-[28rem] rounded-full bg-[#3a3470] opacity-25 blur-3xl dark:block" />
    </div>
  );
}
