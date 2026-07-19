import type { IdentityDocument } from "@/lib/clients/types";
import { daysUntil, isDocumentExpiringSoon } from "@/lib/clients/utils";
import { addIdentityDocument, archiveIdentityDocument } from "../actions";

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";

export function DocumentsPanel({
  clientId,
  documents,
}: {
  clientId: string;
  documents: IdentityDocument[];
}) {
  const addWithId = addIdentityDocument.bind(null, clientId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg text-kmp-graphite">
          Adicionar documento
        </h2>
        <form action={addWithId} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-kmp-graphite">
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
            <label className="block text-sm font-medium text-kmp-graphite">
              Número
            </label>
            <input name="numero" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-kmp-graphite">
              Validade
            </label>
            <input name="validade" type="date" className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {documents.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhum documento cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
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
                  className="flex items-center justify-between p-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-kmp-graphite">
                      {doc.tipo}{" "}
                      {doc.arquivado ? (
                        <span className="ml-2 text-xs text-kmp-graphite/40">
                          (arquivado)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-kmp-graphite/60">
                      {doc.numero ?? "sem número"}
                      {doc.validade
                        ? ` · validade ${new Date(doc.validade).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {expiring ? (
                      <span className="rounded-full bg-kmp-orange/10 px-2.5 py-0.5 text-xs font-medium text-kmp-orange">
                        ⚠{" "}
                        {daysUntil(doc.validade!) < 0
                          ? "vencido"
                          : `${daysUntil(doc.validade!)}d`}
                      </span>
                    ) : null}
                    {!doc.arquivado ? (
                      <form action={archiveWithIds}>
                        <button
                          type="submit"
                          className="text-xs text-kmp-graphite/60 transition hover:text-red-600"
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
    </div>
  );
}
