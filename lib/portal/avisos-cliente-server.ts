import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/storage-admin/email";
import { portalUrl } from "@/lib/dominios";
import { montarAvisoAoCliente, type AvisoAoCliente } from "./avisos-cliente";

/**
 * Manda o alerta ao cliente do processo (Resend). Lê o cliente com a sessão
 * de quem pede (RLS). Nunca lança: o pedido já está gravado e aparece no
 * portal mesmo se o e-mail falhar. Devolve se o e-mail saiu.
 */
export async function avisarCliente(caseId: string, aviso: AvisoAoCliente, pagina: "documentos" | "formulario"): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cases")
      .select("clients(nome, email, idioma_preferencial)")
      .eq("id", caseId)
      .maybeSingle();
    const cliente = (data as unknown as { clients?: { nome: string; email: string | null; idioma_preferencial: string } | null } | null)
      ?.clients;
    if (!cliente?.email) return false;
    const { subject, html } = montarAvisoAoCliente({
      aviso,
      clienteNome: cliente.nome,
      idioma: cliente.idioma_preferencial === "en" ? "en" : "pt",
      link: `${portalUrl()}/portal/${pagina}?processo=${caseId}`,
    });
    const r = await sendEmail([cliente.email], subject, html);
    if (!r.ok) console.error("[avisarCliente] e-mail não enviado:", r.error);
    return r.ok;
  } catch (e) {
    console.error("[avisarCliente] falhou:", e instanceof Error ? e.message : "erro desconhecido");
    return false;
  }
}
