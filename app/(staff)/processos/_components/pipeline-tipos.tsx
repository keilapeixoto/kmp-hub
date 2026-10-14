import Link from "next/link";
import type { ServiceType } from "@/lib/cases/types";
import { DEGRADE, type CorViva } from "@/components/ui/vivid";

// Uma pipeline por tipo de visto (pedido da Keila): pílulas no topo; cada
// tipo abre o quadro com as etapas dele.
const CORES: CorViva[] = ["azul", "turquesa", "lilas", "verde", "amarelo", "rosa", "roxo", "laranja"];

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
  const pilula = "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition";
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/processos?view=kanban"
        className={`${pilula} ${!atual ? "bg-kmp-primary text-kmp-on-primary shadow-sm" : "bg-kmp-surface text-kmp-text shadow-sm hover:bg-white"}`}
      >
        Visão geral
      </Link>
      {ativos.map((st, i) => {
        const cor = DEGRADE[CORES[i % CORES.length]];
        const ativo = atual === st.id;
        return (
          <Link
            key={st.id}
            href={`/processos?view=kanban&servicoTipo=${st.id}`}
            className={`${pilula} ${ativo ? `bg-gradient-to-br ${cor} text-white shadow-md` : "bg-kmp-surface text-kmp-text shadow-sm hover:bg-white"}`}
          >
            {!ativo ? <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${cor}`} /> : null}
            {st.nome}
            <span className={`rounded-full px-2 py-0.5 text-xs ${ativo ? "bg-white/25" : "bg-kmp-text/5"}`}>
              {contagem[st.id] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
