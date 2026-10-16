"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId, getCurrentUserRole } from "@/lib/auth";
import { inviteClientToPortal } from "./actions";
import { criarProcessoComChecklist } from "@/lib/cases/criar";

// Cadastro de cliente novo em um passo: cliente + processo (na primeira etapa)
// + checklist do tipo de serviço + convite do portal. Substitui o formulário
// avulso (HTML + Web3Forms): o cliente preenche o formulário de coleta e envia
// cada documento pelo portal, e tudo já fica no Hub.
// Tudo com a sessão de quem cadastra (RLS); o convite usa a mesma ação do
// card "Acesso ao portal" (só admin/diretor, secret key só lá dentro).

// "valores" volta para a tela em caso de erro: o React limpa o formulário
// depois da ação, e sem isso a pessoa perderia o que digitou.
export type CadastroPortalState = { erro: string | null; valores?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function cadastrarClienteComPortal(
  _prev: CadastroPortalState,
  formData: FormData,
): Promise<CadastroPortalState> {
  const texto = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const nome = texto("nome");
  const email = texto("email")?.toLowerCase() ?? null;
  const servico = texto("service_type_id");
  const convidar = formData.get("convidar") === "on";
  const valores: Record<string, string> = {};
  for (const k of ["nome", "email", "telefone", "service_type_id", "idioma_preferencial", "consultor_id"]) {
    const v = formData.get(k);
    if (typeof v === "string") valores[k] = v;
  }
  if (!convidar) valores.convidar = "nao";

  if (!nome) return { erro: "Informe o nome do cliente.", valores };
  if (!email || !EMAIL.test(email)) return { erro: "Informe um e-mail válido: é por ele que o cliente entra no portal.", valores };
  if (!servico) return { erro: "Escolha o tipo de visto.", valores };

  const userId = await getCurrentUserId();
  if (!userId) return { erro: "Sua sessão expirou. Entre de novo.", valores };
  const role = await getCurrentUserRole();
  const podeConvidar = role === "admin" || role === "director";
  const consultor = (podeConvidar && texto("consultor_id")) || userId;

  const supabase = await createClient();

  // Mesmo e-mail já cadastrado: não cria duplicado.
  const { data: existente } = await supabase.from("clients").select("id").ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
  if (existente) {
    return { erro: "Já existe um cliente com esse e-mail. Abra o perfil dele e crie o processo por lá.", valores };
  }

  const { data: tipo } = await supabase.from("service_types").select("id").eq("id", servico).maybeSingle();
  if (!tipo) return { erro: "Tipo de visto não encontrado.", valores };

  const { data: cliente, error: erroCliente } = await supabase
    .from("clients")
    .insert({
      nome,
      email,
      telefone: texto("telefone"),
      idioma_preferencial: texto("idioma_preferencial") === "en" ? "en" : "pt",
      consultor_id: consultor,
    })
    .select("id")
    .single();
  if (erroCliente || !cliente) {
    console.error("[cadastrarClienteComPortal] cliente:", erroCliente?.code, erroCliente?.message);
    return { erro: "Não foi possível cadastrar o cliente.", valores };
  }
  const clienteId = cliente.id as string;

  const { falhou } = await criarProcessoComChecklist(supabase, { clientId: clienteId, serviceTypeId: servico, consultorId: consultor });
  const avisos: string[] = [...falhou];

  if (convidar && podeConvidar) {
    const convite = await inviteClientToPortal(clienteId, { error: null, success: false });
    if (!convite.success) {
      console.error("[cadastrarClienteComPortal] convite:", convite.error);
      avisos.push("convite");
    }
  }

  revalidatePath("/clientes");
  revalidatePath("/processos");
  const params = new URLSearchParams({ cadastro: avisos.length ? "parcial" : convidar && podeConvidar ? "convidado" : "ok" });
  if (avisos.length) params.set("faltou", avisos.join(","));
  redirect(`/clientes/${clienteId}?${params}`);
}
