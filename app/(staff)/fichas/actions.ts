"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { AI_FILLABLE_SECTIONS } from "@/lib/consultation-forms/constants";
import { EMPTY_CONSULTATION_DATA } from "@/lib/consultation-forms/types";
import type { ConsultationFormData } from "@/lib/consultation-forms/types";

export async function createConsultationForm(formData: FormData) {
  const clientId = String(formData.get("client_id"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("consultation_forms")
    .insert({
      client_id: clientId,
      data: EMPTY_CONSULTATION_DATA,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar a ficha.");
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(`/fichas/${data.id}`);
}

export type AutosaveState = { savedAt: string | null; error: string | null };

export async function autosaveConsultationForm(
  formId: string,
  data: ConsultationFormData,
): Promise<AutosaveState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("consultation_forms")
    .update({ data })
    .eq("id", formId);

  if (error) {
    return { savedAt: null, error: "Não foi possível salvar." };
  }
  return { savedAt: new Date().toISOString(), error: null };
}

export async function deleteConsultationForm(formId: string, clientId: string) {
  const supabase = await createClient();
  await supabase.from("consultation_forms").delete().eq("id", formId);
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}?tab=fichas`);
}

export async function confirmAiSection(
  formId: string,
  section: string,
  pending: string[],
): Promise<string[]> {
  const next = pending.filter((s) => s !== section);
  const supabase = await createClient();
  await supabase
    .from("consultation_forms")
    .update({ ai_pending_sections: next })
    .eq("id", formId);
  return next;
}

const EXTRACTION_SCHEMA_PROMPT = `Você recebe a transcrição (ou resumo) de uma consulta de imigração/educação da KMP Consulting. Extraia as informações e devolva APENAS um JSON válido (sem markdown, sem texto antes ou depois), no seguinte formato exato:

{
  "clientNames": "nome de todos os clientes separados por 'e'",
  "date": "AAAA-MM-DD ou vazio se não mencionado",
  "panorama": [{"name":"", "chegada":"mês/ano de chegada na Austrália", "idade":"", "situacao":"experiência ou situação profissional resumida"}],
  "exp": [{"name":"", "area":"área de formação", "br":"experiência no Brasil", "au":"experiência na Austrália"}],
  "traj": [{"name":"", "rows":[{"course":"nome do curso/qualificação", "country":"BR ou AU", "status":"done, progress ou next"}]}],
  "notes": [{"title":"título curto do ponto discutido", "body":"explicação"}],
  "steps": ["etapa 1 do fluxo recomendado", "etapa 2", "..."],
  "strategyNote": "estratégia para aumentar pontuação, se discutida",
  "benefitNote": "benefícios ou observações adicionais, se discutido",
  "actions": [{"text":"ação a ser feita", "resp":"kmp, parceira, aplicantes ou outro", "status":"progress, next ou done"}]
}

Regras: um item em "panorama" e "exp" para cada cliente mencionado. "traj" agrupa por pessoa, com uma linha por curso/qualificação, na ordem cronológica, com status done (concluído), progress (em andamento) ou next (próximo passo). Se uma informação não foi mencionada, use string vazia ou array vazio — não invente dados. Responda em português.`;

function sectionsWithContent(data: ConsultationFormData): string[] {
  return AI_FILLABLE_SECTIONS.filter((key) => {
    const value = data[key];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && value.trim());
  });
}

export type ExtractionState = {
  data: ConsultationFormData | null;
  pendingSections: string[];
  error: string | null;
};

/**
 * Roda no servidor (chave da Anthropic nunca chega ao cliente). O
 * protótipo original chamava a API direto do navegador — isso só
 * funcionava dentro do ambiente sandboxed do Claude; aqui vira Server
 * Action, seguindo o mesmo padrão de mutação usado no resto do Hub.
 */
export async function extractConsultationDataFromTranscript(
  formId: string,
  transcript: string,
): Promise<ExtractionState> {
  if (!transcript.trim()) {
    return { data: null, pendingSections: [], error: "Cole a transcrição primeiro." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      pendingSections: [],
      error: "ANTHROPIC_API_KEY não configurada no servidor.",
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: EXTRACTION_SCHEMA_PROMPT,
      messages: [{ role: "user", content: transcript }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Sem resposta de texto da API.");
    }

    const clean = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const extracted = { ...EMPTY_CONSULTATION_DATA, ...JSON.parse(clean) } as ConsultationFormData;
    const pendingSections = sectionsWithContent(extracted);

    const supabase = await createClient();
    await supabase
      .from("consultation_forms")
      .update({ data: extracted, ai_pending_sections: pendingSections })
      .eq("id", formId);

    return { data: extracted, pendingSections, error: null };
  } catch {
    return {
      data: null,
      pendingSections: [],
      error: "Erro ao processar a transcrição. Tente novamente ou preencha manualmente.",
    };
  }
}
