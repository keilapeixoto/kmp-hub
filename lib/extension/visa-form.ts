// KMP Hub · Dados do formulário de coleta (case_form_responses) pro
// preenchimento automático de vistos pela extensão de navegador. Mesmo
// padrão de autenticação dos outros endpoints da extensão: token resolvido
// via extension_tokens (lib/extension/tokens.ts), sem sessão/cookie. Como
// usamos createAdminClient() (ignora RLS), a visibilidade de processos é
// replicada aqui chamando a mesma get_user_role() do banco (RLS de
// cases — 20260713121000_cases_rls.sql) em vez de reimplementar a regra.
//
// Escopo inicial (pedido da Keila): só o formulário "Formulário Visto de
// Turista (Subclass 600) — Coleta de Dados", já existente em
// case_form_templates (importado por scripts/import-case-forms.mjs). A
// extensão nunca envia a aplicação de verdade — só busca os dados que o
// cliente já preencheu no portal, pra copiar nos campos do ImmiAccount.

import { createAdminClient } from "@/lib/supabase/admin";

const TEMPLATE_NOME = "Formulário Visto de Turista (Subclass 600) — Coleta de Dados";

async function getRole(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.rpc("get_user_role", { p_user_id: userId });
  return (data as string | null) ?? null;
}

/** Monta o filtro de cases que o usuário pode ver, igual à política de RLS de `cases`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- builder muda de tipo a cada filtro encadeado
function applyCaseVisibility(query: any, role: string | null, userId: string) {
  if (role === "admin" || role === "director" || role === "finance") return query;
  if (role === "consultant" || role === "operations") {
    return query.or(`consultor_id.eq.${userId},equipe.cs.{${userId}}`);
  }
  // partner/client/sem role: nenhum processo via este caminho.
  return query.eq("id", "00000000-0000-0000-0000-000000000000");
}

export type VisaFormCaseOption = {
  caseId: string;
  clienteNome: string;
  statusFormulario: string;
};

/** Lista processos com o formulário do 600 já preenchido, filtrando por nome do cliente. */
export async function searchVisaFormCases(
  userId: string,
  query: string,
): Promise<VisaFormCaseOption[]> {
  const admin = createAdminClient();
  const role = await getRole(admin, userId);
  if (!role) return [];

  const { data: template } = await admin
    .from("case_form_templates")
    .select("id")
    .eq("nome", TEMPLATE_NOME)
    .maybeSingle();
  if (!template) return [];

  let casesQuery = admin
    .from("cases")
    .select("id, client_id, clients!inner(nome)")
    .limit(25);
  casesQuery = applyCaseVisibility(casesQuery, role, userId);
  if (query.trim()) {
    casesQuery = casesQuery.ilike("clients.nome", `%${query.trim()}%`);
  }

  const { data: cases } = await casesQuery;
  if (!cases || cases.length === 0) return [];

  const caseIds = cases.map((c) => c.id);
  const { data: forms } = await admin
    .from("case_forms")
    .select("case_id, status")
    .eq("template_id", template.id)
    .in("case_id", caseIds);

  const statusByCase = new Map((forms ?? []).map((f) => [f.case_id, f.status]));

  return cases
    .filter((c) => statusByCase.has(c.id))
    .map((c) => ({
      caseId: c.id,
      clienteNome:
        (c as unknown as { clients: { nome: string } | null }).clients?.nome ?? "(sem nome)",
      statusFormulario: statusByCase.get(c.id)!,
    }));
}

export type VisaFormField = {
  label: string;
  ajuda: string | null;
  tipo: string;
  opcoes: string[] | null;
  valor: string | null;
};

export type VisaFormStep = {
  titulo: string;
  campos: VisaFormField[];
};

export type VisaFormData = {
  clienteNome: string;
  statusFormulario: string;
  etapas: VisaFormStep[];
};

/** Confere que o usuário pode ver este case (mesma regra de searchVisaFormCases) antes de devolver dados. */
async function canAccessCase(
  admin: ReturnType<typeof createAdminClient>,
  role: string | null,
  userId: string,
  caseId: string,
): Promise<boolean> {
  if (!role) return false;
  if (role === "admin" || role === "director" || role === "finance") return true;
  if (role === "consultant" || role === "operations") {
    const { data } = await admin
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .or(`consultor_id.eq.${userId},equipe.cs.{${userId}}`)
      .maybeSingle();
    return !!data;
  }
  return false;
}

export async function getVisaFormDataForCase(
  userId: string,
  caseId: string,
): Promise<VisaFormData | null> {
  const admin = createAdminClient();
  const role = await getRole(admin, userId);
  if (!(await canAccessCase(admin, role, userId, caseId))) return null;

  const { data: caseRow } = await admin
    .from("cases")
    .select("client_id, clients(nome)")
    .eq("id", caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const { data: template } = await admin
    .from("case_form_templates")
    .select("id")
    .eq("nome", TEMPLATE_NOME)
    .maybeSingle();
  if (!template) return null;

  const { data: caseForm } = await admin
    .from("case_forms")
    .select("id, status")
    .eq("case_id", caseId)
    .eq("template_id", template.id)
    .maybeSingle();
  if (!caseForm) return null;

  const { data: steps } = await admin
    .from("case_form_steps")
    .select("id, titulo, ordem, case_form_fields(id, ordem, label, ajuda, tipo, opcoes)")
    .eq("template_id", template.id)
    .order("ordem");

  const { data: responses } = await admin
    .from("case_form_responses")
    .select("field_id, valor")
    .eq("case_form_id", caseForm.id);
  const valorByField = new Map((responses ?? []).map((r) => [r.field_id, r.valor]));

  const etapas: VisaFormStep[] = (steps ?? []).map((s) => {
    const campos = (
      (s as unknown as {
        case_form_fields: {
          id: string;
          ordem: number;
          label: string;
          ajuda: string | null;
          tipo: string;
          opcoes: string[] | null;
        }[];
      }).case_form_fields ?? []
    )
      .sort((a, b) => a.ordem - b.ordem)
      .map((f) => ({
        label: f.label,
        ajuda: f.ajuda,
        tipo: f.tipo,
        opcoes: f.opcoes,
        valor: valorByField.get(f.id) ?? null,
      }));
    return { titulo: s.titulo, campos };
  });

  return {
    clienteNome:
      (caseRow as unknown as { clients: { nome: string } | null }).clients?.nome ?? "(sem nome)",
    statusFormulario: caseForm.status,
    etapas,
  };
}
