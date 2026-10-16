"use server";

import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";
import { lerCartaDoVisto, type CartaDoVisto } from "@/lib/carta-visto/parse";

// Importar carta de visto (grant notice ou VEVO) no radar de Vencimentos.
// Duas etapas: ler (o PDF é lido no servidor e NÃO é guardado) e salvar (só
// depois que a pessoa confere os dados e escolhe o cliente). Tudo com a
// sessão de quem está logado: o RLS de clients decide quem pode ver/criar.

const MAX_BYTES = 10 * 1024 * 1024;

export type Candidato = { id: string; nome: string; data_nascimento: string | null; visto_atual_subclasse: string | null };

export type LeituraState = {
  erro: string | null;
  carta: CartaDoVisto | null;
  candidatos: Candidato[];
};

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function lerCartaVisto(_prev: LeituraState, formData: FormData): Promise<LeituraState> {
  const vazio = { carta: null, candidatos: [] };
  const arquivo = formData.get("carta");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha o PDF da carta.", ...vazio };
  if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    return { erro: "O arquivo precisa ser um PDF.", ...vazio };
  }
  if (arquivo.size > MAX_BYTES) return { erro: "O PDF passa de 10 MB.", ...vazio };

  let texto: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await arquivo.arrayBuffer()));
    texto = (await extractText(pdf, { mergePages: false })).text.join("\n");
  } catch {
    return { erro: "Não consegui ler esse PDF (pode ser imagem escaneada, sem texto).", ...vazio };
  }

  const carta = lerCartaDoVisto(texto);

  // Clientes com nome parecido: primeiro e último nome, sem acento.
  let candidatos: Candidato[] = [];
  if (carta.nome && /[a-z]{2}/i.test(semAcento(carta.nome))) {
    // Só letras: o nome vem do PDF e entra num ilike (sem % ou _ soltos).
    const partes = semAcento(carta.nome)
      .split(/\s+/)
      .map((p) => p.replace(/[^a-z]/g, ""))
      .filter((p) => p.length >= 2);
    const supabase = await createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, nome, data_nascimento, visto_atual_subclasse")
      .ilike("nome", `%${partes[0]}%`)
      .limit(50);
    const ultimo = partes[partes.length - 1];
    candidatos = ((data ?? []) as Candidato[])
      .filter((c) => semAcento(c.nome).includes(ultimo))
      .sort((a, b) => Number(b.data_nascimento === carta.dataNascimento) - Number(a.data_nascimento === carta.dataNascimento))
      .slice(0, 8);
  }

  return { erro: null, carta, candidatos };
}

export type SalvarCartaState = { erro: string | null; clienteId: string | null; nome: string | null };

export async function salvarCartaVisto(_prev: SalvarCartaState, formData: FormData): Promise<SalvarCartaState> {
  const texto = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const destino = texto("cliente");
  const nome = texto("nome");
  const subclasse = texto("subclasse");
  const validade = texto("validade");
  const nascimento = texto("data_nascimento");
  const erro = (m: string): SalvarCartaState => ({ erro: m, clienteId: null, nome: null });

  if (!destino) return erro("Escolha o cliente ou \"Criar cliente novo\".");
  if (!subclasse || !/^\d{3}$/.test(subclasse)) return erro("A subclasse tem 3 números (ex.: 500).");
  // Sem data é permitido (bridging visa, permanente sem autorização de viagem):
  // o cliente vai para a coluna "Sem data" do radar.
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) return erro("Data de vencimento inválida.");

  const supabase = await createClient();
  if (destino === "novo") {
    if (!nome) return erro("Informe o nome do cliente.");
    const userId = await getCurrentUserId();
    if (!userId) return erro("Sessão expirada — entre de novo.");
    const { data, error } = await supabase
      .from("clients")
      .insert({
        nome,
        data_nascimento: nascimento,
        consultor_id: userId,
        visto_atual_subclasse: subclasse,
        visto_atual_validade: validade,
      })
      .select("id, nome")
      .single();
    if (error || !data) {
      console.error("[salvarCartaVisto] criar:", error?.code, error?.message);
      return erro("Não foi possível criar o cliente.");
    }
    revalidatePath("/vencimentos");
    revalidatePath("/clientes");
    return { erro: null, clienteId: data.id as string, nome: data.nome as string };
  }

  const { data: atual } = await supabase.from("clients").select("id, nome, data_nascimento").eq("id", destino).maybeSingle();
  if (!atual) return erro("Cliente não encontrado.");
  const { error } = await supabase
    .from("clients")
    .update({
      visto_atual_subclasse: subclasse,
      visto_atual_validade: validade,
      // Data de nascimento só preenche se estava vazia; nunca sobrescreve.
      ...(atual.data_nascimento || !nascimento ? {} : { data_nascimento: nascimento }),
    })
    .eq("id", destino)
    .select("id");
  if (error) {
    console.error("[salvarCartaVisto] atualizar:", error.code, error.message);
    return erro("Não foi possível atualizar o cliente.");
  }
  revalidatePath("/vencimentos");
  revalidatePath(`/clientes/${destino}`);
  return { erro: null, clienteId: destino, nome: atual.nome as string };
}
