// Linha do tempo do processo no portal (sem dependências: roda nos testes).
// Só eventos que o cliente pode ver: início, etapas, status, formulário e os
// documentos que ele mesmo enviou — nunca notas, tarefas ou ações internas.

import { traduzir, type Chave, type Idioma } from "./i18n.ts";

export type EventoPortal = { data: string; titulo: string; tipo: "inicio" | "etapa" | "status" | "formulario" | "documento" | "recado" };

const STATUS: Record<string, Chave> = {
  ativo: "ev.ativo",
  pausado: "ev.pausado",
  concluido: "ev.concluido",
  cancelado: "ev.cancelado",
  arquivado: "ev.concluido",
};

export function montarLinhaDoTempo({
  inicio,
  historico,
  formularioEnviadoEm,
  documentos,
  recados = [],
  idioma = "pt",
}: {
  inicio: string | null;
  historico: { campo: string; para: string | null; created_at: string }[];
  formularioEnviadoEm: string | null;
  documentos: { nome: string; created_at: string }[];
  recados?: { mensagem: string; created_at: string }[];
  idioma?: Idioma;
}): EventoPortal[] {
  const t = (c: Chave, v?: Record<string, string>) => traduzir(idioma, c, v);
  const eventos: EventoPortal[] = [];
  if (inicio) eventos.push({ data: inicio, titulo: t("ev.inicio"), tipo: "inicio" });
  for (const h of historico) {
    if (!h.para) continue;
    if (h.campo === "etapa") eventos.push({ data: h.created_at, titulo: t("ev.etapa", { nome: h.para }), tipo: "etapa" });
    else if (h.campo === "status" && STATUS[h.para])
      eventos.push({ data: h.created_at, titulo: t(STATUS[h.para]), tipo: "status" });
  }
  if (formularioEnviadoEm) eventos.push({ data: formularioEnviadoEm, titulo: t("ev.formulario"), tipo: "formulario" });
  for (const d of documentos) eventos.push({ data: d.created_at, titulo: t("ev.documento", { nome: d.nome }), tipo: "documento" });
  for (const r of recados) eventos.push({ data: r.created_at, titulo: r.mensagem, tipo: "recado" });
  return eventos.sort((a, b) => b.data.localeCompare(a.data));
}
