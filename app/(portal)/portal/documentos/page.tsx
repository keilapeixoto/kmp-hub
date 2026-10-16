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
import { getIdiomaDoPortal } from "@/lib/portal/idioma";
import { STATUS_ITEM_EN, tradutor, type Idioma } from "@/lib/portal/i18n";

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

const data = (iso: string, idioma: Idioma = "pt") =>
  new Intl.DateTimeFormat(idioma === "en" ? "en-AU" : "pt-BR", { day: "2-digit", month: "short", timeZone: "Australia/Sydney" }).format(new Date(iso));

function Arquivos({ docs, idioma }: { docs: PortalDocumento[]; idioma: Idioma }) {
  if (docs.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-2 text-sm text-kmp-text/75">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{d.nome}</span>
          <span className="shrink-0 text-xs text-kmp-text/60">{data(d.created_at, idioma)}</span>
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
  idioma,
}: {
  item: ChecklistItem;
  docs: PortalDocumento[];
  upload: React.ReactNode;
  idioma: Idioma;
}) {
  const t = tradutor(idioma);
  const aprovado = item.status === "aprovado";
  return (
    <li id={`item-${item.id}`} className="scroll-mt-6 rounded-2xl bg-kmp-text/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-kmp-text">{item.nome}</p>
          {item.descricao ? <p className="mt-0.5 text-sm text-kmp-text/70">{item.descricao}</p> : null}
        </div>
        <Etiqueta cor={corDoStatus(item.status)}>{(idioma === "en" ? STATUS_ITEM_EN[item.status] : CHECKLIST_ITEM_STATUS_LABELS[item.status]) ?? item.status}</Etiqueta>
      </div>
      {item.status === "rejeitado" && item.motivo_rejeicao ? (
        <p className="mt-3 rounded-xl bg-[#fde2e5] p-3 text-sm text-[#9a2433]">
          {t("docs.novoEnvio", { motivo: item.motivo_rejeicao })}
        </p>
      ) : null}
      {item.observacao_equipe ? (
        <p className="mt-3 text-sm text-kmp-text/75">{t("docs.observacao", { texto: item.observacao_equipe })}</p>
      ) : null}
      {item.prazo && !aprovado ? (
        <p className="mt-2 text-sm font-medium text-kmp-text">
          {t("docs.prazo", { data: new Date(`${item.prazo.slice(0, 10)}T00:00:00`).toLocaleDateString(idioma === "en" ? "en-AU" : "pt-BR") })}
        </p>
      ) : null}
      <Arquivos docs={docs} idioma={idioma} />
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
  const idioma = await getIdiomaDoPortal();
  const t = tradutor(idioma);

  if (!portalCase) notFound();

  const topo = items.filter((i) => !i.parent_item_id);
  const grupos: { titulo: string; cor: CorViva; icon: typeof Inbox; itens: ChecklistItem[] }[] = [
    { titulo: t("docs.pedidos"), cor: "laranja", icon: Inbox, itens: topo.filter((i) => STATUS_COM_O_CLIENTE.includes(i.status)) },
    { titulo: t("docs.comEquipe"), cor: "azul", icon: Clock, itens: topo.filter((i) => COM_A_EQUIPE.includes(i.status)) },
    { titulo: t("docs.quandoTiver"), cor: "cinza", icon: FileText, itens: topo.filter((i) => i.status === "nao_solicitado") },
    { titulo: t("docs.aprovados"), cor: "verde", icon: Check, itens: topo.filter((i) => i.status === "aprovado") },
  ];

  const upload = (checklistItemId: string | null) => (
    <PortalUploadForm
      clientId={portalCase.client_id}
      caseId={portalCase.id}
      checklistItemId={checklistItemId}
      categories={checklistItemId ? [] : categories}
      bucket={DOCUMENTS_BUCKET}
      regras={regras}
      idioma={idioma}
    />
  );

  return (
    <>
      <PortalHeader idioma={idioma} />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-kmp-text/70 hover:text-kmp-text">
            <ArrowLeft className="h-4 w-4" /> {t("docs.voltar")}
          </Link>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-kmp-text">{t("docs.titulo")}</h1>
          <p className="mt-1 text-sm text-kmp-text/70">
            {portalCase.service_type_nome ?? t("docs.processo")}. {t("docs.sub")}
          </p>
        </div>

        {topo.length === 0 ? (
          <p className={`${cartao} text-center text-sm text-kmp-text/70`}>
            {t("docs.semLista")}
          </p>
        ) : (
          grupos
            .filter((g) => g.itens.length > 0)
            .map((g) => (
              <section key={g.titulo} className={cartao}>
                <FaixaTitulo titulo={g.titulo} cor={g.cor} icon={g.icon} direita={g.itens.length} />
                <ul className="space-y-3">
                  {g.itens.map((item) => (
                    <Item key={item.id} item={item} docs={documentsByItem[item.id] ?? []} upload={upload(item.id)} idioma={idioma} />
                  ))}
                </ul>
              </section>
            ))
        )}

        <section className={cartao}>
          <FaixaTitulo titulo={t("docs.outros")} cor="roxo" icon={FolderUp} />
          <p className="text-sm text-kmp-text/70">
            {t("docs.outrosSub")}
          </p>
          <Arquivos docs={documentsByItem[""] ?? []} idioma={idioma} />
          {upload(null)}
        </section>
      </main>
    </>
  );
}
