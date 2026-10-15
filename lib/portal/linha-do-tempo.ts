// Linha do tempo do processo no portal (sem dependências: roda nos testes).
// Só eventos que o cliente pode ver: início, etapas, status, formulário e os
// documentos que ele mesmo enviou — nunca notas, tarefas ou ações internas.

export type EventoPortal = { data: string; titulo: string; tipo: "inicio" | "etapa" | "status" | "formulario" | "documento" };

const STATUS: Record<string, string> = {
  ativo: "Processo em andamento",
  pausado: "Processo pausado",
  concluido: "Processo concluído",
  cancelado: "Processo cancelado",
  arquivado: "Processo concluído",
};

export function montarLinhaDoTempo({
  inicio,
  historico,
  formularioEnviadoEm,
  documentos,
}: {
  inicio: string | null;
  historico: { campo: string; para: string | null; created_at: string }[];
  formularioEnviadoEm: string | null;
  documentos: { nome: string; created_at: string }[];
}): EventoPortal[] {
  const eventos: EventoPortal[] = [];
  if (inicio) eventos.push({ data: inicio, titulo: "Início do processo", tipo: "inicio" });
  for (const h of historico) {
    if (!h.para) continue;
    if (h.campo === "etapa") eventos.push({ data: h.created_at, titulo: `Etapa: ${h.para}`, tipo: "etapa" });
    else if (h.campo === "status" && STATUS[h.para])
      eventos.push({ data: h.created_at, titulo: STATUS[h.para], tipo: "status" });
  }
  if (formularioEnviadoEm) eventos.push({ data: formularioEnviadoEm, titulo: "Formulário de dados enviado", tipo: "formulario" });
  for (const d of documentos) eventos.push({ data: d.created_at, titulo: `Você enviou: ${d.nome}`, tipo: "documento" });
  return eventos.sort((a, b) => b.data.localeCompare(a.data));
}
