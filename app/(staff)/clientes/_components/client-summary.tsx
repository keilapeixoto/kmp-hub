import Link from "next/link";
import { AlertTriangle, IdCard } from "lucide-react";
import { FaixaTitulo } from "@/components/ui/vivid";
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

  const linhas: { label: string; valor: React.ReactNode }[] = [
    { label: "E-mail", valor: client.email ?? "—" },
    { label: "Telefone", valor: client.telefone ?? "—" },
    { label: "País", valor: client.pais ?? "—" },
    { label: "Situação", valor: client.situacao ?? "—" },
    {
      label: "Idioma do portal",
      valor: client.idioma_preferencial === "en" ? "English" : "Português",
    },
    {
      label: "Dependentes",
      valor: `${relations.length} cadastrado${relations.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
        <FaixaTitulo titulo="Dados gerais" cor="lilas" icon={IdCard} />
        <dl className="space-y-2 text-sm">
          {linhas.map((l) => (
            <div key={l.label} className="flex justify-between gap-3">
              <dt className="text-kmp-text/60">{l.label}</dt>
              <dd className="truncate text-right font-medium text-kmp-text">{l.valor}</dd>
            </div>
          ))}
          {client.lead_id ? (
            <div className="flex justify-between gap-3">
              <dt className="text-kmp-text/60">Origem</dt>
              <dd>
                <Link href={`/leads/${client.lead_id}`} className="font-medium text-kmp-orange hover:underline">
                  ver lead de origem
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="overflow-hidden rounded-3xl bg-kmp-surface p-5 shadow-sm">
        <FaixaTitulo titulo="Documentos de identidade" cor="laranja" icon={AlertTriangle} />
        {expiring.length === 0 ? (
          <p className="text-sm text-kmp-text/60">Nenhum documento vencendo em breve.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {expiring.map((doc) => {
              const days = daysUntil(doc.validade!);
              return (
                <li key={doc.id} className="font-medium text-[#a8490a] dark:text-[#f8b07a]">
                  {doc.tipo} {days < 0 ? "vencido" : `vence em ${days} dias`}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
