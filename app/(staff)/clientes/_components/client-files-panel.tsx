import { Archive, FileText, FolderOpen, RotateCcw, Upload } from "lucide-react";
import type { DocumentWithCategoryName } from "@/lib/documents/data";
import type { DocumentCategory } from "@/lib/documents/types";
import { DocumentNameEditor } from "@/app/(staff)/_components/document-name-editor";
import {
  PastaEditor,
  StatusRevisaoSelect,
} from "@/app/(staff)/_components/document-meta-controls";
import { FaixaTitulo } from "@/components/ui/vivid";
import { PreviaDocumento } from "@/components/documentos/previa-documento";
import { BotaoExcluir } from "@/components/documentos/botao-excluir";
import { EnvioDoHub } from "./envio-do-hub";
import {
  archiveClientFile,
  renameClientFile,
  restoreClientFile,
  deleteClientFilePermanently,
  updateClientFilePasta,
  updateClientFileStatusRevisao,
} from "../actions";

const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm";

function displayName(doc: DocumentWithCategoryName): string {
  return doc.nome ?? doc.storage_path.split("/").pop() ?? doc.storage_path;
}

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Australia/Sydney" }).format(
    new Date(iso),
  );

/**
 * Aba Documentos do cliente (redesign out/2026): enviar no topo (vários de
 * uma vez), arquivos por categoria com pré-visualizar/baixar/excluir e, para
 * admin, os arquivados com restaurar. "Excluir" arquiva (soft delete).
 */
export function ClientFilesPanel({
  clientId,
  documents,
  isAdmin,
  processos,
  categories,
  regras,
}: {
  clientId: string;
  documents: DocumentWithCategoryName[];
  isAdmin: boolean;
  processos: { id: string; nome: string }[];
  categories: DocumentCategory[];
  regras: { extensoes: string[]; maxBytes: number };
}) {
  const active = documents.filter((d) => !d.arquivado);
  const archived = documents.filter((d) => d.arquivado);

  const byCategoria = new Map<string, DocumentWithCategoryName[]>();
  for (const doc of active) {
    const key = doc.categoria_nome ?? doc.categoria ?? "Sem categoria";
    const list = byCategoria.get(key) ?? [];
    list.push(doc);
    byCategoria.set(key, list);
  }

  return (
    <div className="space-y-6">
      <section className={cartao}>
        <FaixaTitulo titulo="Adicionar arquivos" cor="laranja" icon={Upload} />
        <EnvioDoHub clientId={clientId} processos={processos} categories={categories} regras={regras} />
      </section>

      {active.length === 0 ? (
        <p className={`${cartao} text-center text-sm text-kmp-text/70`}>Nenhum arquivo deste cliente ainda.</p>
      ) : (
        Array.from(byCategoria.entries()).map(([categoria, docs]) => (
          <section key={categoria} className={cartao}>
            <FaixaTitulo titulo={categoria} cor="lilas" icon={FolderOpen} direita={docs.length} />
            <ul className="divide-y divide-kmp-divider">
              {docs.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-kmp-text/50" />
                    <DocumentNameEditor
                      nome={displayName(doc)}
                      href={`/api/documents/${doc.id}/download`}
                      archived={false}
                      onRename={renameClientFile.bind(null, clientId, doc.id)}
                    />
                    <PastaEditor pasta={doc.pasta} onSave={updateClientFilePasta.bind(null, clientId, doc.id)} />
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {!doc.checklist_item_id ? (
                      <StatusRevisaoSelect
                        status={doc.status_revisao}
                        onSave={updateClientFileStatusRevisao.bind(null, clientId, doc.id)}
                      />
                    ) : null}
                    <span className="mx-2 hidden text-xs text-kmp-text/60 sm:inline">{data(doc.created_at)}</span>
                    <PreviaDocumento id={doc.id} nome={displayName(doc)} formato={doc.formato ?? null} />
                    <BotaoExcluir nome={displayName(doc)} action={archiveClientFile.bind(null, clientId, doc.id)} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {isAdmin && archived.length > 0 ? (
        <details className={cartao}>
          <summary className="-m-5 flex cursor-pointer list-none items-center gap-2.5 bg-[#a3a6ad]/15 px-5 py-3 font-heading text-base font-semibold text-[#3f4247] dark:bg-white/10 dark:text-white/80">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 dark:bg-white/10">
              <Archive className="h-[18px] w-[18px]" />
            </span>
            Arquivados ({archived.length})
            <span className="ml-auto text-sm font-medium opacity-80">só admin vê · clique para abrir</span>
          </summary>
          <ul className="mt-8 divide-y divide-kmp-divider">
            {archived.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2.5 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-kmp-text/50" />
                <span className="min-w-0 flex-1 truncate text-kmp-text/80">{displayName(doc)}</span>
                <PreviaDocumento id={doc.id} nome={displayName(doc)} formato={doc.formato ?? null} />
                <form action={restoreClientFile.bind(null, clientId, doc.id)}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-kmp-text/5 px-3 py-1.5 text-xs font-semibold text-kmp-text hover:bg-kmp-text/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </button>
                </form>
                <BotaoExcluir
                  definitivo
                  nome={displayName(doc)}
                  action={deleteClientFilePermanently.bind(null, clientId, doc.id)}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
