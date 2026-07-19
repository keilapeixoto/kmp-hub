import Link from "next/link";
import type { ConsultantOption, Lead } from "@/lib/leads/types";
import { daysSinceLastContact, isLeadInactive } from "@/lib/leads/utils";
import { InactivityBadge, StatusBadge } from "./status-badge";

export function LeadsTable({
  leads,
  consultants,
}: {
  leads: Lead[];
  consultants: ConsultantOption[];
}) {
  const consultantName = (id: string) =>
    consultants.find((c) => c.user_id === id)?.nome ?? "—";

  if (leads.length === 0) {
    return (
      <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
        Nenhum lead encontrado com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Contato</th>
            <th className="px-4 py-3 font-medium">País</th>
            <th className="px-4 py-3 font-medium">Origem</th>
            <th className="px-4 py-3 font-medium">Serviço</th>
            <th className="px-4 py-3 font-medium">Consultor</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Acompanhamento</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {lead.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {lead.telefone ?? lead.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {lead.pais ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {lead.origem ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {lead.servico_interesse ?? "—"}
              </td>
              <td className="px-4 py-3 text-kmp-graphite/80">
                {consultantName(lead.consultor_id)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3">
                {isLeadInactive(lead) ? (
                  <InactivityBadge days={daysSinceLastContact(lead)} />
                ) : (
                  <span className="text-kmp-graphite/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
