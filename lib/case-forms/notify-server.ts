import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/storage-admin/email";
import { avisarDocumento, avisarEnvio, type DepsAviso } from "./notify";

function deps(): DepsAviso {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    enviar: sendEmail,
    buscarDestino: async (id) => {
      const admin = createAdminClient();
      const { data: c } = await admin
        .from("cases")
        .select("consultor_id, clients(nome)")
        .eq("id", id)
        .single();
      if (!c) return null;
      const { data: u } = await admin.auth.admin.getUserById(c.consultor_id as string);
      const cliente = (c as unknown as { clients?: { nome: string } | null }).clients;
      return { email: u.user?.email ?? null, clienteNome: cliente?.nome ?? "Cliente" };
    },
  };
}

export async function notifyFormSubmitted(caseId: string): Promise<void> {
  await avisarEnvio(deps(), caseId);
}

export async function notifyDocumentUploaded(caseId: string, documento: string): Promise<void> {
  await avisarDocumento(deps(), caseId, documento);
}
