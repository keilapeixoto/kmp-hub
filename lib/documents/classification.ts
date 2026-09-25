/**
 * Classificação automática de documentos via API da Anthropic (mesmo padrão
 * de lib/storage-admin/email.ts — fetch direto, sem SDK, pra não adicionar
 * mais uma dependência só pra um POST). ANTHROPIC_API_KEY só existe no
 * servidor, nunca chega ao navegador.
 */
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

export type ClassificationCandidate = {
  id: string;
  nome: string;
  descricao: string | null;
};

export type ClassificationResult = {
  checklist_item_id: string | null;
  document_type: string;
  confidence: number;
};

export type ClassificationOutcome = ClassificationResult | { error: string };

const KNOWN_DOCUMENT_TYPES =
  "passaporte, extrato_bancario, coe, certidao_antecedentes, seguro_saude, " +
  "comprovante_ingles, comprovante_qualificacao, exame_medico, skills_assessment, outro";

function buildPrompt(candidates: ClassificationCandidate[]): string {
  const lista = candidates.length
    ? candidates
        .map((c, i) => `${i + 1}. id=${c.id} — ${c.nome}${c.descricao ? ` (${c.descricao})` : ""}`)
        .join("\n")
    : "(nenhum item de checklist pendente neste processo)";

  return `Você classifica documentos de imigração para uma consultoria australiana.

Itens do checklist deste processo que ainda podem precisar de um documento:
${lista}

Tipos gerais de documento conhecidos (use "outro" se nenhum servir): ${KNOWN_DOCUMENT_TYPES}.

Olhe o documento anexado e responda SOMENTE com um JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"checklist_item_id": "<id do item mais provável da lista acima, ou null se nenhum servir>", "document_type": "<um dos tipos gerais listados>", "confidence": <número de 0 a 1>}`;
}

/** application/pdf → "document"; image/* → "image"; qualquer outro formato não é suportado pela API pra visão. */
function contentBlockType(mediaType: string): "document" | "image" | null {
  if (mediaType === "application/pdf") return "document";
  if (mediaType.startsWith("image/")) return "image";
  return null;
}

export async function classifyDocument(
  fileBuffer: Buffer,
  mediaType: string,
  candidates: ClassificationCandidate[],
): Promise<ClassificationOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY não configurada" };
  }

  const blockType = contentBlockType(mediaType);
  if (!blockType) {
    return { error: `formato "${mediaType}" não suportado para classificação automática` };
  }

  const body = {
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: blockType,
            source: { type: "base64", media_type: mediaType, data: fileBuffer.toString("base64") },
          },
          { type: "text", text: buildPrompt(candidates) },
        ],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "falha de rede ao chamar a API da Anthropic" };
  }

  if (!res.ok) {
    return { error: `Anthropic respondeu ${res.status}` };
  }

  const json = (await res.json()) as { content?: { text?: string }[] };
  const text = json.content?.[0]?.text;
  if (typeof text !== "string") {
    return { error: "resposta inesperada da API" };
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { error: "não foi possível interpretar a resposta da IA" };
  }

  let parsed: { checklist_item_id: string | null; document_type: string; confidence: number };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { error: "JSON inválido na resposta da IA" };
  }

  const validIds = new Set(candidates.map((c) => c.id));
  const checklistItemId =
    typeof parsed.checklist_item_id === "string" && validIds.has(parsed.checklist_item_id)
      ? parsed.checklist_item_id
      : null;

  return {
    checklist_item_id: checklistItemId,
    document_type: typeof parsed.document_type === "string" && parsed.document_type ? parsed.document_type : "outro",
    confidence:
      typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
  };
}
