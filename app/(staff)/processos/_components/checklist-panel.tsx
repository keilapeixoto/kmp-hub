import { CHECKLIST_ITEM_STATUSES } from "@/lib/checklists/constants";
import type { Checklist, ChecklistItem } from "@/lib/checklists/types";
import type { Document } from "@/lib/documents/types";
import { getSignedDocumentUrl } from "@/lib/documents/data";
import {
  archiveDocument,
  createChecklistFromTemplate,
  updateChecklistItemStatus,
  uploadDocument,
} from "../checklist-actions";

async function ItemDocuments({
  clientId,
  caseId,
  itemId,
  documents,
}: {
  clientId: string;
  caseId: string;
  itemId: string;
  documents: Document[];
}) {
  const uploadWithIds = uploadDocument.bind(null, clientId, caseId, itemId);

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      doc,
      url: doc.arquivado ? null : await getSignedDocumentUrl(doc.storage_path),
    })),
  );

  return (
    <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
      {documentsWithUrls.length > 0 ? (
        <ul className="space-y-1">
          {documentsWithUrls.map(({ doc, url }) => {
            const archiveWithIds = archiveDocument.bind(null, doc.id, caseId);
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between text-xs text-kmp-graphite/70"
              >
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-kmp-orange hover:underline"
                  >
                    {doc.storage_path.split("/").pop()}
                  </a>
                ) : (
                  <span>{doc.storage_path.split("/").pop()} (arquivado)</span>
                )}
                {!doc.arquivado ? (
                  <form action={archiveWithIds}>
                    <button
                      type="submit"
                      className="text-kmp-graphite/50 hover:text-red-600"
                    >
                      Arquivar
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <form action={uploadWithIds} className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-xs text-kmp-graphite/70"
        />
        <button
          type="submit"
          className="rounded-md bg-kmp-graphite/10 px-3 py-1 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function ChecklistItemRow({
  caseId,
  item,
  documents,
  clientId,
}: {
  caseId: string;
  item: ChecklistItem;
  documents: Document[];
  clientId: string;
}) {
  const updateWithIds = updateChecklistItemStatus.bind(null, caseId, item.id);

  return (
    <li className="rounded-md border border-black/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-kmp-graphite">{item.nome}</p>
          {item.descricao ? (
            <p className="mt-0.5 text-xs text-kmp-graphite/60">
              {item.descricao}
            </p>
          ) : null}
        </div>
        <form
          action={updateWithIds}
          className="flex shrink-0 items-center gap-2"
        >
          <select
            name="status"
            defaultValue={item.status}
            className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
          >
            {CHECKLIST_ITEM_STATUSES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-kmp-graphite/10 px-2 py-1 text-xs font-medium text-kmp-graphite transition hover:bg-kmp-orange hover:text-white"
          >
            Salvar
          </button>
        </form>
      </div>

      <ItemDocuments
        clientId={clientId}
        caseId={caseId}
        itemId={item.id}
        documents={documents}
      />
    </li>
  );
}

export async function ChecklistPanel({
  caseId,
  clientId,
  serviceTypeChecklistTemplateId,
  checklist,
  items,
  documentsByItem,
}: {
  caseId: string;
  clientId: string;
  serviceTypeChecklistTemplateId: string | null;
  checklist: Checklist | null;
  items: ChecklistItem[];
  documentsByItem: Record<string, Document[]>;
}) {
  if (!checklist) {
    if (!serviceTypeChecklistTemplateId) {
      return (
        <p className="rounded-lg bg-white p-6 text-sm text-kmp-graphite/60 shadow-sm">
          Este tipo de serviço ainda não tem um template de checklist
          configurado em Configurações → Tipos de serviço.
        </p>
      );
    }

    const createWithIds = createChecklistFromTemplate.bind(
      null,
      caseId,
      serviceTypeChecklistTemplateId,
    );

    return (
      <div className="rounded-lg bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-kmp-graphite/60">
          Nenhum checklist criado para este processo ainda.
        </p>
        <form action={createWithIds} className="mt-4">
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Criar checklist a partir do template
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-kmp-graphite">
            {checklist.percentual}% completo
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-black/5">
          <div
            className="h-2 rounded-full bg-kmp-orange transition-all"
            style={{ width: `${checklist.percentual}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            caseId={caseId}
            item={item}
            documents={documentsByItem[item.id] ?? []}
            clientId={clientId}
          />
        ))}
      </ul>
    </div>
  );
}
