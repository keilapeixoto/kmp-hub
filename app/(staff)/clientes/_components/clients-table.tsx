import Link from "next/link";
import type { ConsultantOption } from "@/lib/leads/types";
import type { Client } from "@/lib/clients/types";

export function ClientsTable({
  clients,
  consultants,
}: {
  clients: Client[];
  consultants: ConsultantOption[];
}) {
  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";

  if (clients.length === 0) {
    return (
      <p className="rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep p-8 text-center text-sm text-kmp-text/50 shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
        Nenhum cliente encontrado com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-kmp-surface dark:border dark:border-kmp-config/40 dark:bg-gradient-to-br dark:from-kmp-panel dark:to-kmp-panel-deep shadow-sm dark:shadow-md dark:shadow-kmp-config/20">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-kmp-divider text-xs uppercase text-kmp-text/50">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Contato</th>
            <th className="px-4 py-3 font-medium">País</th>
            <th className="px-4 py-3 font-medium">Situação</th>
            <th className="px-4 py-3 font-medium">Consultor</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-kmp-divider last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/clientes/${client.id}`}
                  className="font-medium text-kmp-text hover:text-kmp-orange"
                >
                  {client.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-kmp-text/70">
                {client.telefone ?? client.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-text/70">
                {client.pais ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-text/70">
                {client.situacao ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-text/70">
                {consultantName(client.consultor_id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
