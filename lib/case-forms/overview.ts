// Quantos formulários de clientes estão aguardando ou prontos para revisar.
// Sem dependências do app (roda nos testes).
export type LinhaProcesso = {
  service_types: { case_form_template_id: string | null } | null;
  case_forms: { status: string }[];
};

export function contarFormularios(rows: LinhaProcesso[]): { aguardando: number; enviados: number } {
  let aguardando = 0;
  let enviados = 0;
  for (const r of rows) {
    if (!r.service_types?.case_form_template_id) continue;
    const f = r.case_forms[0];
    if (!f || f.status === "em_preenchimento") aguardando++;
    else if (f.status === "enviado") enviados++;
  }
  return { aguardando, enviados };
}
