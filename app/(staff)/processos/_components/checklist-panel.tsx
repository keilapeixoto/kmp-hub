import { CHECKLIST_ITEM_STATUSES } from "@/lib/checklists/constants";
import type { Checklist, ChecklistItem } from "@/lib/checklists/types";
import type { Document, DocumentCategory } from "@/lib/documents/types";
import { getDocumentCategories, getSignedDocumentUrl } from "@/lib/documents/data";
import { DocumentNameEditor } from "@/app/(staff)/_components/document-name-editor";
import { PastaEditor } from "@/app/(staff)/_components/document-meta-controls";
import { UploadDocumentForm } from "@/app/(staff)/_components/upload-document-form";
import {
  archiveDocument,
  createChecklistFromTemplate,
  createSubtask,
  renameDocument,
  updateChecklistItemStatus,
  updateDocumentPasta,
  uploadDocument,
} from "../checklist-actions";

function displayName(doc: Document): string {
  return doc.nome ?? doc.storage_path.split("/").pop() ?? doc.storage_path;
}

async function ItemDocuments({
  clientId,
  caseId,
  itemId,
  documents,
  categories,
}: {
  clientId: string;
  caseId: string;
  itemId: string;
  documents: Document[];
  categories: DocumentCategory[];
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
            const renameWithIds = renameDocument.bind(null, doc.id, caseId);
            const pastaWithIds = updateDocumentPasta.bind(null, doc.id, caseId);
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 text-xs text-kmp-graphite/70"
              >
                <span className="flex items-center gap-2">
                  <DocumentNameEditor
                    nome={displayName(doc)}
                    href={url}
                    archived={doc.arquivado}
                    onRename={renameWithIds}
                  />
                  <PastaEditor pasta={doc.pasta} onSave={pastaWithIds} />
                </span>
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

      <UploadDocumentForm action={uploadWithIds} categories={categories} />
    </div>
  );
}

function formatPrazo(prazo: string | null): string {
  if (!prazo) return "";
  return prazo;
}

function SubtaskRow({
  caseId,
  item,
}: {
  caseId: string;
  item: ChecklistItem;
}) {
  const updateWithIds = updateChecklistItemStatus.bind(null, caseId, item.id);

  return (
    <li className="ml-6 flex items-center justify-between gap-3 border-l-2 border-black/5 py-2 pl-3 text-sm">
      <span className="text-kmp-graphite">{item.nome}</span>
      <form action={updateWithIds} className="flex shrink-0 items-center gap-2">
        <input
          type="date"
          name="prazo"
          defaultValue={formatPrazo(item.prazo)}
          className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
        />
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
    </li>
  );
}

function AddSubtaskForm({
  caseId,
  checklistId,
  parentItemId,
}: {
  caseId: string;
  checklistId: string;
  parentItemId: string;
}) {
  const createWithIds = createSubtask.bind(
    null,
    caseId,
    checklistId,
    parentItemId,
  );

  return (
    <form
      action={createWithIds}
      className="ml-6 flex items-center gap-2 border-l-2 border-black/5 py-1.5 pl-3"
    >
      <input
        type="text"
        name="nome"
        placeholder="Nova subtarefa…"
        className="flex-1 rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
      />
      <button
        type="submit"
        className="text-xs font-medium text-kmp-graphite/60 hover:text-kmp-orange"
      >
        + Adicionar
      </button>
    </form>
  );
}

function ChecklistItemRow({
  caseId,
  checklistId,
  item,
  subtasks,
  documents,
  clientId,
  categories,
}: {
  caseId: string;
  checklistId: string;
  item: ChecklistItem;
  subtasks: ChecklistItem[];
  documents: Document[];
  clientId: string;
  categories: DocumentCategory[];
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
          <input
            type="date"
            name="prazo"
            defaultValue={formatPrazo(item.prazo)}
            title="Prazo"
            className="rounded-md border border-black/10 px-2 py-1 text-xs text-kmp-graphite"
          />
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

      {subtasks.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {subtasks.map((sub) => (
            <SubtaskRow key={sub.id} caseId={caseId} item={sub} />
          ))}
        </ul>
      ) : null}
      <div className="mt-2">
        <AddSubtaskForm
          caseId={caseId}
          checklistId={checklistId}
          parentItemId={item.id}
        />
      </div>

      <ItemDocuments
        clientId={clientId}
        caseId={caseId}
        itemId={item.id}
        documents={documents}
        categories={categories}
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
  const categories = await getDocumentCategories();

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
        {items
          .filter((item) => !item.parent_item_id)
          .map((item) => (
            <ChecklistItemRow
              key={item.id}
              caseId={caseId}
              checklistId={checklist.id}
              item={item}
              subtasks={items.filter((i) => i.parent_item_id === item.id)}
              documents={documentsByItem[item.id] ?? []}
              clientId={clientId}
              categories={categories}
            />
          ))}
      </ul>
    </div>
  );
}
