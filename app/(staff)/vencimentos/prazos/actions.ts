"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserRole } from "@/lib/auth";
import { sendEmail } from "@/lib/storage-admin/email";
import { getReminderEmail } from "@/lib/case-deadlines/email-templates";
import { daysUntil } from "@/lib/clients/utils";
import { defaultPrazoFinal } from "@/lib/case-deadlines/utils";
import { REQUEST_TYPE_LABELS, type ReminderMilestone } from "@/lib/case-deadlines/constants";

export type DeadlineFormState = {
  error: string | null;
};

export async function createCaseDeadline(
  _prevState: DeadlineFormState,
  formData: FormData,
): Promise<DeadlineFormState> {
  const caseId = formData.get("case_id");
  const tipoPedido = formData.get("tipo_pedido");
  const dataPedido = formData.get("data_pedido");
  const prazoFinalInput = formData.get("prazo_final");
  const notas = formData.get("notas");

  if (typeof caseId !== "string" || !caseId) {
    return { error: "Selecione o processo." };
  }
  if (typeof tipoPedido !== "string" || !tipoPedido) {
    return { error: "Selecione o tipo de pedido." };
  }
  if (typeof dataPedido !== "string" || !dataPedido) {
    return { error: "Informe a data do pedido." };
  }

  const prazoFinal =
    typeof prazoFinalInput === "string" && prazoFinalInput.trim()
      ? prazoFinalInput
      : defaultPrazoFinal(dataPedido);

  const supabase = await createClient();
  const { error } = await supabase.from("case_deadlines").insert({
    case_id: caseId,
    tipo_pedido: tipoPedido,
    data_pedido: dataPedido,
    prazo_final: prazoFinal,
    notas: typeof notas === "string" && notas.trim() ? notas.trim() : null,
  });

  if (error) {
    return { error: "Não foi possível criar o prazo. Confira os campos e tente de novo." };
  }

  revalidatePath("/vencimentos/prazos");
  return { error: null };
}

export async function updateDeadlineStatus(id: string, status: string) {
  const supabase = await createClient();
  const patch: Record<string, string | null> = { status };
  if (status === "documento_recebido") {
    patch.documento_recebido_em = new Date().toISOString().slice(0, 10);
  }
  await supabase.from("case_deadlines").update(patch).eq("id", id);
  revalidatePath("/vencimentos/prazos");
}

export async function updateDeadlinePrazo(id: string, prazoFinal: string) {
  const supabase = await createClient();
  await supabase.from("case_deadlines").update({ prazo_final: prazoFinal }).eq("id", id);
  revalidatePath("/vencimentos/prazos");
}

/**
 * Envio manual (modo revisão) de um lembrete devido — restrito a admin/diretor.
 * Usa o cliente admin porque o envio + o registro no histórico são operação
 * de sistema (mesmo padrão de app/api/cron/storage-check/route.ts), não uma
 * edição de dado que passe pela RLS comum do usuário.
 */
export async function sendReminderNow(
  deadlineId: string,
  milestone: ReminderMilestone,
): Promise<{ ok: boolean; error: string | null }> {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    return { ok: false, error: "Só admin ou diretor podem enviar lembretes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: deadline } = await admin
    .from("case_deadlines")
    .select("id, tipo_pedido, prazo_final, cases(clients(nome, email))")
    .eq("id", deadlineId)
    .maybeSingle();

  if (!deadline) return { ok: false, error: "Prazo não encontrado." };

  const cliente = (
    deadline as unknown as { cases: { clients: { nome: string; email: string | null } | null } | null }
  ).cases?.clients;

  if (!cliente?.email) {
    return { ok: false, error: "Cliente sem e-mail cadastrado." };
  }

  const dias = daysUntil(deadline.prazo_final as string);
  const { subject, html } = await getReminderEmail(milestone, {
    nome_estudante: cliente.nome,
    tipo_documento:
      REQUEST_TYPE_LABELS[deadline.tipo_pedido as string] ?? (deadline.tipo_pedido as string),
    data_limite: new Date(deadline.prazo_final as string).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    }),
    dias_restantes: dias,
  });

  const result = await sendEmail([cliente.email], subject, html);

  await admin.from("case_deadline_reminders").insert({
    case_deadline_id: deadlineId,
    marco_dias: milestone,
    destinatario: cliente.email,
    status: result.ok ? "enviado" : "falhou",
    detalhe: result.error,
    enviado_por: user?.id ?? null,
  });

  revalidatePath("/vencimentos/prazos");
  return result;
}
