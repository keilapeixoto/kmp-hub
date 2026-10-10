import Link from "next/link";
import type {
  Client,
  ClientRelationWithRelated,
  IdentityDocument,
} from "@/lib/clients/types";
import { daysUntil, isDocumentExpiringSoon } from "@/lib/clients/utils";

export function ClientSummary({
  client,
  relations,
  documents,
}: {
  client: Client;
  relations: ClientRelationWithRelated[];
  documents: IdentityDocument[];
}) {
  const expiring = documents.filter(
    (d) => !d.arquivado && isDocumentExpiringSoon(d.validade),
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-6 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        <h2 className="font-heading text-lg text-kmp-text">
          Dados gerais
        </h2>
        <dl className="mt-4 space-y-2 text-sm text-kmp-text/70">
          <div>
            <dt className="inline font-medium">País: </dt>
            <dd className="inline">{client.pais ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Situação: </dt>
            <dd className="inline">{client.situacao ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Idioma do portal: </dt>
            <dd className="inline">
              {client.idioma_preferencial === "en" ? "English" : "Português"}
            </dd>
          </div>
          {client.lead_id ? (
            <div>
              <dt className="inline font-medium">Origem: </dt>
              <dd className="inline">
                <Link
                  href={`/leads/${client.lead_id}`}
                  className="text-kmp-orange hover:underline"
                >
                  ver lead de origem
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-6 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        <h2 className="font-heading text-lg text-kmp-text">
          Pendências
        </h2>
        {expiring.length === 0 ? (
          <p className="mt-4 text-sm text-kmp-text/50">
            Nenhum documento vencendo em breve.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {expiring.map((doc) => {
              const days = daysUntil(doc.validade!);
              return (
                <li key={doc.id} className="text-kmp-orange">
                  ⚠ {doc.tipo} {days < 0 ? "vencido" : `vence em ${days} dias`}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-sm text-kmp-text/50">
          {relations.length} dependente{relations.length === 1 ? "" : "s"}{" "}
          cadastrado{relations.length === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
}
