// Montagem e gravação das respostas de um formulário. Sem dependências do
// app (roda nos testes). A gravação é em blocos pequenos com uma nova
// tentativa: cada linha gera também um registro de auditoria, e um upsert
// grande estourou o limite de tempo do banco (57014).
import type { CaseFormField } from "./types";

export type LinhaResposta = { case_form_id: string; field_id: string; valor: string | null };
type Erro = { code?: string; message: string };

export function linhasDeFormData(
  caseFormId: string,
  fields: Pick<CaseFormField, "id">[],
  formData: FormData,
): LinhaResposta[] {
  return fields.map((f) => {
    const raw = formData.get(f.id);
    const valor = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    return { case_form_id: caseFormId, field_id: f.id, valor };
  });
}

type Upserter = {
  from: (tabela: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: (linhas: any, opcoes: { onConflict: string }) => PromiseLike<{ error: Erro | null }>;
  };
};

export async function salvarRespostasEmBlocos(
  supabase: Upserter,
  linhas: LinhaResposta[],
  tamanho = 8,
): Promise<{ gravados: number; total: number; erro: Erro | null }> {
  let gravados = 0;
  for (let i = 0; i < linhas.length; i += tamanho) {
    const bloco = linhas.slice(i, i + tamanho);
    let erro: Erro | null = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const { error } = await supabase
        .from("case_form_responses")
        .upsert(bloco, { onConflict: "case_form_id,field_id" });
      erro = error;
      if (!error) break;
    }
    if (erro) return { gravados, total: linhas.length, erro };
    gravados += bloco.length;
  }
  return { gravados, total: linhas.length, erro: null };
}
