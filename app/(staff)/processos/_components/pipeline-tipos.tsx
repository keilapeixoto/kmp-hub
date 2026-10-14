import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ServiceType } from "@/lib/cases/types";

// Uma pipeline por tipo de visto (pedido da Keila): pílulas no topo; cada
// tipo abre o quadro com as etapas dele. Sóbrio: sem bolinhas coloridas; à
// vista só os tipos com processo, o resto em "Outros tipos".
export function PipelineTipos({
  serviceTypes,
  atual,
  contagem,
}: {
  serviceTypes: ServiceType[];
  atual: string | undefined;
  contagem: Record<string, number>;
}) {
  const ativos = serviceTypes.filter((s) => !s.arquivado);
  const comProcesso = ativos.filter((s) => (contagem[s.id] ?? 0) > 0 || s.id === atual);
  const outros = ativos.filter((s) => !comProcesso.includes(s));

  const pilula = "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition";
  const ativa = "bg-kmp-primary text-kmp-on-primary shadow-sm";
  const inativa = "bg-kmp-surface text-kmp-text shadow-sm hover:bg-white";

  const item = (st: ServiceType) => (
    <Link
      key={st.id}
      href={`/processos?view=kanban&servicoTipo=${st.id}`}
      className={`${pilula} ${atual === st.id ? ativa : inativa}`}
    >
      {st.nome}
      <span className={`text-xs ${atual === st.id ? "opacity-80" : "text-kmp-text/60"}`}>{contagem[st.id] ?? 0}</span>
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/processos?view=kanban" className={`${pilula} ${!atual ? ativa : inativa}`}>
        Visão geral
      </Link>
      {comProcesso.map(item)}
      {outros.length > 0 ? (
        <details className="relative">
          <summary className={`${pilula} ${inativa} cursor-pointer list-none`}>
            Outros tipos ({outros.length}) <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <div className="absolute left-0 z-30 mt-2 flex w-80 flex-col gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-kmp-panel dark:ring-white/10">
            {outros.map((st) => (
              <Link
                key={st.id}
                href={`/processos?view=kanban&servicoTipo=${st.id}`}
                className="rounded-full px-3 py-2 text-sm font-medium text-kmp-text hover:bg-kmp-text/5"
              >
                {st.nome}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
