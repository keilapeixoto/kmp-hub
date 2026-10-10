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
      <p className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep p-8 text-center text-sm text-white/50 shadow-md shadow-kmp-config/20">
        Nenhum lead encontrado com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase text-white/50">
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
            <tr key={lead.id} className="border-b border-white/10 last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-white hover:text-kmp-orange"
                >
                  {lead.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-white/70">
                {lead.telefone ?? lead.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-white/70">
                {lead.pais ?? "—"}
              </td>
              <td className="px-4 py-3 text-white/70">
                {lead.origem ?? "—"}
              </td>
              <td className="px-4 py-3 text-white/70">
                {lead.servico_interesse ?? "—"}
              </td>
              <td className="px-4 py-3 text-white/70">
                {consultantName(lead.consultor_id)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3">
                {isLeadInactive(lead) ? (
                  <InactivityBadge days={daysSinceLastContact(lead)} />
                ) : (
                  <span className="text-white/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
