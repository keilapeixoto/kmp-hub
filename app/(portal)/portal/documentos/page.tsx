import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, FileText, FolderUp, Inbox } from "lucide-react";
import {
  getPortalCase,
  getPortalCases,
  getPortalChecklistItems,
  getPortalDocumentsByChecklistItem,
  type PortalDocumento,
} from "@/lib/portal/data";
import { STATUS_COM_O_CLIENTE } from "@/lib/portal/progresso";
import { DOCUMENTS_BUCKET, getDocumentCategories } from "@/lib/documents/data";
import { getStorageSettings } from "@/lib/storage-admin/validation";
import { CHECKLIST_ITEM_STATUS_LABELS } from "@/lib/checklists/constants";
import type { ChecklistItem } from "@/lib/checklists/types";
import { Etiqueta, FaixaTitulo, type CorViva } from "@/components/ui/vivid";
import { PortalHeader } from "../_components/portal-header";
import { PortalUploadForm } from "../_components/portal-upload-form";
import { PreviaDocumento } from "@/components/documentos/previa-documento";

type SearchParams = Record<string, string | string[] | undefined>;

const cartao = "overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm";
const COM_A_EQUIPE = ["enviado", "em_analise", "reenviado", "aguardando_aprovacao"];

function corDoStatus(status: string): CorViva {
  if (status === "aprovado") return "verde";
  if (status === "rejeitado" || status === "reenvio_solicitado") return "vermelho";
  if (STATUS_COM_O_CLIENTE.includes(status)) return "amarelo";
  if (COM_A_EQUIPE.includes(status)) return "azul";
  return "cinza";
}

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "Australia/Sydney" }).format(new Date(iso));

function Arquivos({ docs }: { docs: PortalDocumento[] }) {
  if (docs.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-2 text-sm text-kmp-text/75">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{d.nome}</span>
          <span className="shrink-0 text-xs text-kmp-text/60">{data(d.created_at)}</span>
          <PreviaDocumento id={d.id} nome={d.nome} formato={d.formato} />
        </li>
      ))}
    </ul>
  );
}

function Item({
  item,
  docs,
  upload,
}: {
  item: ChecklistItem;
  docs: PortalDocumento[];
  upload: React.ReactNode;
}) {
  const aprovado = item.status === "aprovado";
  return (
    <li id={`item-${item.id}`} className="scroll-mt-6 rounded-2xl bg-kmp-text/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-kmp-text">{item.nome}</p>
          {item.descricao ? <p className="mt-0.5 text-sm text-kmp-text/70">{item.descricao}</p> : null}
        </div>
        <Etiqueta cor={corDoStatus(item.status)}>{CHECKLIST_ITEM_STATUS_LABELS[item.status] ?? item.status}</Etiqueta>
      </div>
      {item.status === "rejeitado" && item.motivo_rejeicao ? (
        <p className="mt-3 rounded-xl bg-[#fde2e5] p-3 text-sm text-[#9a2433]">
          Precisamos de um novo envio: {item.motivo_rejeicao}
        </p>
      ) : null}
      {item.observacao_equipe ? (
        <p className="mt-3 text-sm text-kmp-text/75">Observação da equipe: {item.observacao_equipe}</p>
      ) : null}
      <Arquivos docs={docs} />
      {aprovado ? null : upload}
    </li>
  );
}

export default async function PortalDocumentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const processoParam = Array.isArray(sp.processo) ? sp.processo[0] : sp.processo;

  let caseId = processoParam ?? null;
  if (!caseId) {
    const cases = await getPortalCases();
    if (cases.length === 0) notFound();
    caseId = cases[0].id;
  }

  const [portalCase, items, documentsByItem, categories, settings] = await Promise.all([
    getPortalCase(caseId),
    getPortalChecklistItems(caseId),
    getPortalDocumentsByChecklistItem(caseId),
    getDocumentCategories(),
    getStorageSettings(),
  ]);
  const regras = { extensoes: settings.allowed_extensions, maxBytes: settings.max_file_size_bytes };

  if (!portalCase) notFound();

  const topo = items.filter((i) => !i.parent_item_id);
  const grupos: { titulo: string; cor: CorViva; icon: typeof Inbox; itens: ChecklistItem[] }[] = [
    { titulo: "Pedidos para você", cor: "laranja", icon: Inbox, itens: topo.filter((i) => STATUS_COM_O_CLIENTE.includes(i.status)) },
    { titulo: "Com a equipe", cor: "azul", icon: Clock, itens: topo.filter((i) => COM_A_EQUIPE.includes(i.status)) },
    { titulo: "Quando tiver em mãos", cor: "cinza", icon: FileText, itens: topo.filter((i) => i.status === "nao_solicitado") },
    { titulo: "Aprovados", cor: "verde", icon: Check, itens: topo.filter((i) => i.status === "aprovado") },
  ];

  const upload = (checklistItemId: string | null) => (
    <PortalUploadForm
      clientId={portalCase.client_id}
      caseId={portalCase.id}
      checklistItemId={checklistItemId}
      categories={checklistItemId ? [] : categories}
      bucket={DOCUMENTS_BUCKET}
      regras={regras}
    />
  );

  return (
    <>
      <PortalHeader />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/70 hover:text-kmp-text">
            <ArrowLeft className="h-4 w-4" /> Meu processo
          </Link>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-kmp-text">Documentos</h1>
          <p className="mt-1 text-sm text-kmp-text/70">
            {portalCase.service_type_nome ?? "Processo"}. Envie os documentos pedidos: assim que sobem, a equipe já
            recebe para análise. Fotos do celular e PDFs são aceitos.
          </p>
        </div>

        {topo.length === 0 ? (
          <p className={`${cartao} text-center text-sm text-kmp-text/70`}>
            A equipe ainda não montou a lista de documentos do seu processo. Se já tiver algo para mandar, use
            &quot;Outros documentos&quot; abaixo.
          </p>
        ) : (
          grupos
            .filter((g) => g.itens.length > 0)
            .map((g) => (
              <section key={g.titulo} className={cartao}>
                <FaixaTitulo titulo={g.titulo} cor={g.cor} icon={g.icon} direita={g.itens.length} />
                <ul className="space-y-3">
                  {g.itens.map((item) => (
                    <Item key={item.id} item={item} docs={documentsByItem[item.id] ?? []} upload={upload(item.id)} />
                  ))}
                </ul>
              </section>
            ))
        )}

        <section className={cartao}>
          <FaixaTitulo titulo="Outros documentos" cor="roxo" icon={FolderUp} />
          <p className="text-sm text-kmp-text/70">
            Algo que não está na lista, mas que a sua consultora pediu ou que você acha importante. Escreva qual
            documento é antes de enviar.
          </p>
          <Arquivos docs={documentsByItem[""] ?? []} />
          {upload(null)}
        </section>
      </main>
    </>
  );
}
