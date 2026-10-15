import type { IdentityDocument } from "@/lib/clients/types";
import { daysUntil, isDocumentExpiringSoon } from "@/lib/clients/utils";
import { addIdentityDocument, archiveIdentityDocument } from "../actions";
import { IdCard } from "lucide-react";
import { Etiqueta, FaixaTitulo } from "@/components/ui/vivid";

const inputClass =
  "mt-1 w-full rounded-xl border border-kmp-text/15 bg-white/85 px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-2 focus:ring-kmp-orange/20 dark:bg-white/10";

export function DocumentsPanel({
  clientId,
  documents,
}: {
  clientId: string;
  documents: IdentityDocument[];
}) {
  const addWithId = addIdentityDocument.bind(null, clientId);

  return (
    <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
      <FaixaTitulo titulo="Documentos de identidade" cor="azul" icon={IdCard} direita={documents.length || null} />
      <div>
        <p className="text-sm font-semibold text-kmp-text">Adicionar documento</p>
        <form action={addWithId} className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-kmp-text">
              Tipo
            </label>
            <input
              name="tipo"
              required
              placeholder="Passaporte, RG…"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-kmp-text">
              Número
            </label>
            <input name="numero" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-kmp-text">
              Validade
            </label>
            <input name="validade" type="date" className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>

      <div className="mt-5 border-t border-kmp-divider pt-2">
        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-kmp-text/60">
            Nenhum documento cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-kmp-divider">
            {documents.map((doc) => {
              const expiring = !doc.arquivado && isDocumentExpiringSoon(doc.validade);
              const archiveWithIds = archiveIdentityDocument.bind(
                null,
                clientId,
                doc.id,
              );
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-kmp-text">
                      {doc.tipo}{" "}
                      {doc.arquivado ? (
                        <span className="ml-2 text-xs text-kmp-text/40">
                          (arquivado)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-kmp-text/50">
                      {doc.numero ?? "sem número"}
                      {doc.validade
                        ? ` · validade ${new Date(doc.validade).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {expiring ? (
                      <Etiqueta cor={daysUntil(doc.validade!) < 0 ? "vermelho" : "amarelo"}>
                        {daysUntil(doc.validade!) < 0 ? "vencido" : `vence em ${daysUntil(doc.validade!)}d`}
                      </Etiqueta>
                    ) : null}
                    {!doc.arquivado ? (
                      <form action={archiveWithIds}>
                        <button
                          type="submit"
                          className="text-xs text-kmp-text/50 transition hover:text-red-400"
                        >
                          Arquivar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
