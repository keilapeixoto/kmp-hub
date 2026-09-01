import { getSignedDocumentUrl } from "@/lib/documents/data";
import type { Document } from "@/lib/documents/types";
import type { ChecklistItem } from "@/lib/checklists/types";
import { ConfirmClassificationRow } from "./confirm-classification-row";

/**
 * Documentos que a classificação automática não conseguiu confirmar sozinha
 * (confiança abaixo do limite, ou a chamada à IA falhou) — a equipe escolhe
 * o tipo e o item do checklist manualmente aqui.
 */
export async function PendingClassificationPanel({
  caseId,
  documents,
  checklistItems,
}: {
  caseId: string;
  documents: Document[];
  checklistItems: ChecklistItem[];
}) {
  const pending = documents.filter((d) => d.revisao_classificacao_pendente && !d.arquivado);
  if (pending.length === 0) return null;

  const topLevelItems = checklistItems
    .filter((i) => !i.parent_item_id)
    .map((i) => ({ id: i.id, nome: i.nome }));

  const withUrls = await Promise.all(
    pending.map(async (doc) => ({ doc, url: await getSignedDocumentUrl(doc.storage_path) })),
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-heading text-lg text-kmp-graphite">
        Documentos aguardando confirmação de tipo ({pending.length})
      </h2>
      <p className="mt-1 text-xs text-kmp-graphite/60">
        Confirme o tipo e, se aplicável, o item do checklist — ou digite um nome se nenhum tipo da
        lista descrever bem o documento.
      </p>
      <ul className="mt-3 space-y-3">
        {withUrls.map(({ doc, url }) => (
          <ConfirmClassificationRow
            key={doc.id}
            documentId={doc.id}
            caseId={caseId}
            fileName={doc.nome_original ?? doc.nome ?? "arquivo"}
            url={url}
            suggestedType={doc.document_type}
            suggestedConfidence={doc.classification_confidence}
            checklistItemOptions={topLevelItems}
          />
        ))}
      </ul>
    </div>
  );
}
