// Quais campos obrigatórios ainda estão vazios. Sem dependências: roda no
// servidor e nos testes.
import type { CaseFormField } from "./types";

export type EtapaComCampos = {
  titulo: string;
  fields: Pick<CaseFormField, "id" | "label" | "obrigatorio">[];
};

export type Pendente = { etapa: number; titulo: string; fieldId: string; label: string };

export function camposPendentes(
  etapas: EtapaComCampos[],
  respostas: Record<string, string>,
): Pendente[] {
  const pendentes: Pendente[] = [];
  etapas.forEach((etapa, i) => {
    for (const f of etapa.fields) {
      if (f.obrigatorio && !(respostas[f.id] ?? "").trim()) {
        pendentes.push({ etapa: i + 1, titulo: etapa.titulo, fieldId: f.id, label: f.label });
      }
    }
  });
  return pendentes;
}
