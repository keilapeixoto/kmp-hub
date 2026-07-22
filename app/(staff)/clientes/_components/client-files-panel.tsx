import { FileText } from "lucide-react";
import type { DocumentWithCategoryName } from "@/lib/documents/data";
import { DocumentNameEditor } from "@/app/(staff)/_components/document-name-editor";
import { archiveClientFile, renameClientFile } from "../actions";

function fileName(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath;
}

function displayName(doc: DocumentWithCategoryName): string {
  return doc.nome ?? fileName(doc.storage_path);
}

/**
 * Arquivos do cliente na tabela documents (importados da migração ou enviados
 * por processos), agrupados por categoria. Download via
 * /api/documents/[id]/download — URL assinada gerada na hora do clique.
 */
export function ClientFilesPanel({
  clientId,
  documents,
}: {
  clientId: string;
  documents: DocumentWithCategoryName[];
}) {
  const active = documents.filter((d) => !d.arquivado);
  const archived = documents.filter((d) => d.arquivado);

  if (documents.length === 0) {
    return (
      <p className="rounded-lg bg-white p-6 text-center text-sm text-kmp-graphite/60 shadow-sm">
        Nenhum arquivo enviado para este cliente ainda.
      </p>
    );
  }

  const byCategoria = new Map<string, DocumentWithCategoryName[]>();
  for (const doc of active) {
    const key = doc.categoria_nome ?? doc.categoria ?? "Sem categoria";
    const list = byCategoria.get(key) ?? [];
    list.push(doc);
    byCategoria.set(key, list);
  }

  return (
    <div className="space-y-6">
      {Array.from(byCategoria.entries()).map(([categoria, docs]) => (
        <div key={categoria} className="rounded-lg bg-white shadow-sm">
          <h3 className="border-b border-black/5 px-4 py-3 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            {categoria}
            <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-kmp-graphite/50 normal-case tracking-normal">
              {docs.length}
            </span>
          </h3>
          <ul className="divide-y divide-black/5">
            {docs.map((doc) => {
              const archiveWithIds = archiveClientFile.bind(null, clientId, doc.id);
              const renameWithIds = renameClientFile.bind(null, clientId, doc.id);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-kmp-graphite/40" />
                    <DocumentNameEditor
                      nome={displayName(doc)}
                      href={`/api/documents/${doc.id}/download`}
                      archived={false}
                      onRename={renameWithIds}
                    />
                  </span>
                  <form action={archiveWithIds} className="shrink-0">
                    <button
                      type="submit"
                      className="text-xs text-kmp-graphite/50 transition hover:text-red-600"
                    >
                      Arquivar
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {archived.length > 0 ? (
        <p className="text-xs text-kmp-graphite/50">
          {archived.length} arquivo{archived.length === 1 ? "" : "s"} arquivado
          {archived.length === 1 ? "" : "s"} (visível{archived.length === 1 ? "" : "is"} só para admin).
        </p>
      ) : null}
    </div>
  );
}
