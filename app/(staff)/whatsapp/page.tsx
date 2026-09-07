import { getWhatsappConversations } from "@/lib/whatsapp/data";
import { CONVERSATION_STAGE_ORDER, type ConversationStage } from "@/lib/whatsapp/constants";
import type { WhatsappConversation } from "@/lib/whatsapp/types";
import { WhatsappKanban } from "./_components/whatsapp-kanban";

function groupByEtapa(
  conversations: WhatsappConversation[],
): Record<ConversationStage, WhatsappConversation[]> {
  const buckets = Object.fromEntries(
    CONVERSATION_STAGE_ORDER.map((etapa) => [etapa, [] as WhatsappConversation[]]),
  ) as Record<ConversationStage, WhatsappConversation[]>;

  for (const conversation of conversations) {
    buckets[conversation.etapa].push(conversation);
  }
  return buckets;
}

export default async function WhatsappPage() {
  const conversations = await getWhatsappConversations();
  const buckets = groupByEtapa(conversations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">WhatsApp</h1>
        <p className="text-sm text-kmp-graphite/60">
          Conversas organizadas por etapa — arraste um card para reclassificar. Ainda não conectado
          ao WhatsApp de verdade (ver docs/spec-whatsapp.md): estes são dados de demonstração até a
          extensão de navegador entrar em produção.
        </p>
      </div>

      <WhatsappKanban buckets={buckets} />
    </div>
  );
}
