import { DOCUMENT_TYPES } from "@/lib/documents/constants";
import { getSignedDocumentUrl } from "@/lib/documents/data";
import type { Document } from "@/lib/documents/types";
import type { ChecklistItem } from "@/lib/checklists/types";
import { confirmDocumentClassification } from "../document-classification-actions";

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

  const topLevelItems = checklistItems.filter((i) => !i.parent_item_id);

  const withUrls = await Promise.all(
    pending.map(async (doc) => ({ doc, url: await getSignedDocumentUrl(doc.storage_path) })),
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-heading text-lg text-kmp-graphite">
        Documentos aguardando confirmação de tipo ({pending.length})
      </h2>
      <p className="mt-1 text-xs text-kmp-graphite/60">
        A classificação automática não teve confiança suficiente nestes arquivos — confirme o
        tipo e, se aplicável, o item do checklist.
      </p>
      <ul className="mt-3 space-y-3">
        {withUrls.map(({ doc, url }) => {
          const confirmWithIds = confirmDocumentClassification.bind(null, doc.id, caseId);
          return (
            <li key={doc.id} className="rounded-md bg-white p-3">
              <a
                href={url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-kmp-graphite hover:text-kmp-orange"
              >
                {doc.nome_original ?? doc.nome ?? "arquivo"}
              </a>
              {doc.document_type ? (
                <p className="mt-0.5 text-xs text-kmp-graphite/60">
                  Sugestão da IA: {doc.document_type} (
                  {Math.round((doc.classification_confidence ?? 0) * 100)}% de confiança)
                </p>
              ) : null}
              <form action={confirmWithIds} className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  name="document_type"
                  defaultValue={doc.document_type ?? "outro"}
                  className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select
                  name="checklist_item_id"
                  defaultValue=""
                  className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
                >
                  <option value="">Sem vínculo com item do checklist</option>
                  {topLevelItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-kmp-orange px-3 py-1 text-xs font-medium text-white transition hover:opacity-90"
                >
                  Confirmar
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
