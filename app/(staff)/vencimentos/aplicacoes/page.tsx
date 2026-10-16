import Link from "next/link";
import { Etiqueta, FAIXA } from "@/components/ui/vivid";
import { APLICACAO_LABELS, COLUNAS_APLICACAO, SKILLS_LABELS } from "@/lib/aplicacoes/constants";
import { getAplicacoes, type LinhaDeAplicacao } from "@/lib/aplicacoes/data";
import { REQUEST_TYPE_LABELS } from "@/lib/case-deadlines/constants";
import { prazoRelativo } from "@/lib/clients/perfil-calc";
import { VencimentosTabs } from "../_components/vencimentos-tabs";
import { StatusAplicacaoSelect } from "../_components/status-aplicacao-select";
import { CartaoArrastavel, ColunaQueRecebe } from "../_components/aplicacoes-dnd";

// Quadro de Aplicações: em que pé está cada aplicação no Department, com o
// pedido de informação (RFI) aberto e o skills assessment de cada processo.

function dataBr(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function AplicacoesPage() {
  const { linhas, ativo } = await getAplicacoes();
  const hoje = new Date().toISOString().slice(0, 10);
  const porColuna = (slug: string) =>
    linhas.filter((l) => (slug === "recusada" ? ["recusada", "retirada"].includes(l.aplicacaoStatus) : l.aplicacaoStatus === slug));
  const comRfi = linhas.filter((l) => l.pedidoAberto).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-text">Aplicações</h1>
        <p className="text-sm text-kmp-text/60">
          Processos em andamento por situação no Department. Mude o status no próprio cartão; datas e
          skills assessment ficam no processo, em &quot;Andamento da aplicação&quot;. Pedidos de informação
          com prazo vêm da aba Prazos de 28 dias.
        </p>
      </div>

      <VencimentosTabs />

      {!ativo ? (
        <p className="rounded-3xl bg-kmp-surface p-5 text-sm text-kmp-text/70 shadow-sm">
          O andamento das aplicações ainda não foi ativado no banco de dados.
        </p>
      ) : (
        <>
          {comRfi > 0 ? (
            <p className="rounded-2xl bg-[#fde6d4] px-4 py-3 text-sm font-medium text-[#8f3f07] dark:bg-[#f27b20]/20 dark:text-[#f9c39b]">
              {comRfi} {comRfi === 1 ? "processo com pedido do Department em aberto" : "processos com pedido do Department em aberto"}.
            </p>
          ) : null}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUNAS_APLICACAO.map((col) => {
              const cards = porColuna(col.slug);
              return (
                <ColunaQueRecebe key={col.slug} status={col.slug} className="flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl bg-kmp-surface shadow-sm">
                  <h2 className={`flex items-center justify-between px-4 py-3 font-heading text-sm font-semibold ${FAIXA[col.cor]}`}>
                    {col.slug === "recusada" ? "Recusada / retirada" : APLICACAO_LABELS[col.slug]}
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs dark:bg-white/10">{cards.length}</span>
                  </h2>
                  <div className="flex flex-col gap-2 p-3">
                    {cards.map((l: LinhaDeAplicacao) => {
                      const prazo = l.pedidoAberto ? prazoRelativo(l.pedidoAberto.prazo, hoje) : null;
                      return (
                        <CartaoArrastavel key={l.caseId} caseId={l.caseId} className="rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                          <Link href={`/clientes/${l.clientId}`} className="font-semibold text-kmp-text hover:text-kmp-orange">
                            {l.clienteNome}
                          </Link>
                          <Link href={`/processos/${l.caseId}`} className="mt-0.5 block text-xs text-kmp-text/60 hover:text-kmp-orange">
                            {l.servico}
                          </Link>
                          {l.enviadaEm ? <p className="mt-1 text-xs text-kmp-text/60">Enviada em {dataBr(l.enviadaEm)}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {l.pedidoAberto && prazo ? (
                              <Etiqueta cor={prazo.atrasado ? "vermelho" : "laranja"}>
                                {REQUEST_TYPE_LABELS[l.pedidoAberto.tipo] ?? "Pedido"}: {prazo.atrasado ? "venceu" : "vence"} {prazo.texto}
                              </Etiqueta>
                            ) : null}
                            {l.skillsStatus !== "nao_se_aplica" ? (
                              <Etiqueta cor={l.skillsStatus === "aprovado" ? "verde" : l.skillsStatus === "negado" ? "vermelho" : "lilas"}>
                                Skills: {SKILLS_LABELS[l.skillsStatus] ?? l.skillsStatus}
                                {l.skillsOrgao ? ` (${l.skillsOrgao})` : ""}
                              </Etiqueta>
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <StatusAplicacaoSelect key={l.aplicacaoStatus} caseId={l.caseId} status={l.aplicacaoStatus} />
                          </div>
                        </CartaoArrastavel>
                      );
                    })}
                    {cards.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-kmp-divider p-3 text-center text-xs text-kmp-text/50">Vazio</p>
                    ) : null}
                  </div>
                </ColunaQueRecebe>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
