import type { Idioma } from "./i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCaseFormTemplateForCase } from "@/lib/case-forms/data";
import type { PortalCase } from "./data";
import { itensPendentesDoCliente, percentualPreenchido } from "./progresso";
import { montarLinhaDoTempo, type EventoPortal } from "./linha-do-tempo";

export type ResumoProcesso = {
  caseId: string;
  servico: string;
  etapas: string[];
  /** índice da etapa atual em `etapas`, ou -1 se o processo não tem etapa definida */
  etapaAtual: number;
  formulario: { templateId: string; nome: string; percentual: number; enviado: boolean } | null;
  pendentes: { id: string; nome: string; status: string }[];
  consultora: { nome: string; email: string | null; telefone: string | null } | null;
  linhaDoTempo: EventoPortal[];
  /** recado mais recente da equipe para o cliente */
  recado: { mensagem: string; created_at: string } | null;
};

/**
 * Resumo de cada processo para a tela inicial do portal: etapas, o que falta
 * o cliente fazer e com quem falar.
 *
 * Recebe só processos que já vieram da leitura com a sessão do cliente
 * (getPortalCases, filtrada por RLS) — é essa leitura que prova que o processo
 * é dele. A partir daí usa o cliente admin para o que o RLS do cliente não
 * libera de propósito (etapas configuradas, nome/contato da consultora) e
 * devolve só esses campos, nunca a linha inteira.
 */
export async function getResumosDoPortal(
  cases: PortalCase[],
  usuarioId: string | null,
  idioma: Idioma = "pt",
): Promise<ResumoProcesso[]> {
  if (cases.length === 0) return [];
  const admin = createAdminClient();

  return Promise.all(
    cases.map(async (c) => {
      const [{ data: etapas }, { data: checklist }, template, consultora, { data: historico }, { data: docs }, { data: recados }] = await Promise.all([
        admin.from("case_stages").select("id, nome").eq("service_type_id", c.service_type_id).order("ordem"),
        admin.from("checklists").select("id").eq("case_id", c.id).maybeSingle(),
        getCaseFormTemplateForCase(c.id),
        contatoDaConsultora(c.consultor_id),
        admin.from("case_status_history").select("campo, para, created_at").eq("case_id", c.id),
        // só o que o próprio cliente enviou (mesma regra da tela de documentos)
        usuarioId
          ? admin
              .from("documents")
              .select("nome, created_at")
              .eq("case_id", c.id)
              .eq("enviado_por", usuarioId)
              .eq("arquivado", false)
          : Promise.resolve({ data: [] as { nome: string; created_at: string }[] }),
        // tabela nova (migração 20261015120000): antes de aplicada, volta erro e fica vazio
        admin
          .from("case_client_updates")
          .select("mensagem, created_at")
          .eq("case_id", c.id)
          .order("created_at", { ascending: false }),
      ]);

      const { data: itens } = checklist
        ? await admin
            .from("checklist_items")
            .select("id, nome, status, parent_item_id")
            .eq("checklist_id", checklist.id)
            .is("parent_item_id", null)
            .order("created_at")
        : { data: [] };

      let formulario: ResumoProcesso["formulario"] = null;
      let formularioEnviadoEm: string | null = null;
      if (template) {
        const [{ data: passos }, { data: caseForm }] = await Promise.all([
          admin.from("case_form_steps").select("id").eq("template_id", template.id),
          admin.from("case_forms").select("id, status, enviado_em").eq("case_id", c.id).eq("template_id", template.id).maybeSingle(),
        ]);
        const { data: campos } = await admin
          .from("case_form_fields")
          .select("id")
          .in("step_id", (passos ?? []).map((p) => p.id));
        const { data: respostas } = caseForm
          ? await admin.from("case_form_responses").select("field_id, valor").eq("case_form_id", caseForm.id)
          : { data: [] };
        formularioEnviadoEm = (caseForm?.enviado_em as string | null) ?? null;
        formulario = {
          templateId: template.id,
          nome: template.nome,
          percentual: percentualPreenchido((campos ?? []).map((f) => f.id), respostas ?? []),
          enviado: caseForm ? caseForm.status !== "em_preenchimento" : false,
        };
      }

      const lista = etapas ?? [];
      return {
        caseId: c.id,
        servico: c.service_type_nome ?? "Processo",
        etapas: lista.map((e) => e.nome as string),
        etapaAtual: lista.findIndex((e) => e.id === c.etapa_id),
        formulario,
        pendentes: itensPendentesDoCliente(itens ?? []),
        consultora,
        recado: (recados ?? [])[0] ?? null,
        linhaDoTempo: montarLinhaDoTempo({
          idioma,
          recados: recados ?? [],
          inicio: c.inicio,
          historico: historico ?? [],
          formularioEnviadoEm,
          documentos: (docs ?? []).map((d) => ({ nome: (d.nome as string) ?? "Arquivo", created_at: d.created_at as string })),
        }),
      };
    }),
  );
}

async function contatoDaConsultora(userId: string | null): Promise<ResumoProcesso["consultora"]> {
  if (!userId) return null;
  const admin = createAdminClient();
  const [{ data: perfil }, { data: usuario }] = await Promise.all([
    admin.from("profiles").select("nome, telefone").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  if (!perfil) return null;
  return {
    nome: (perfil.nome as string) ?? "Sua consultora",
    email: usuario.user?.email ?? null,
    telefone: (perfil.telefone as string | null) ?? null,
  };
}
