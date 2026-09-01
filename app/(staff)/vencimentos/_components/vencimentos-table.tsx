import Link from "next/link";
import type { VisaPanelRow } from "@/lib/vencimentos/data";
import { daysUntil } from "@/lib/clients/utils";
import {
  VISA_URGENCY_COLORS,
  VISA_URGENCY_LABELS,
  type VisaUrgency,
} from "@/lib/clients/constants";

type RowComData = VisaPanelRow & { urgencia: VisaUrgency };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function VencimentosTable({
  comData,
  semData,
}: {
  comData: RowComData[];
  semData: VisaPanelRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Subclasse</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Dias restantes</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {comData.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-kmp-graphite/60"
                >
                  Nenhum cliente encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              comData.map((c) => {
                const dias = daysUntil(c.visto_atual_validade!);
                return (
                  <tr key={c.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium text-kmp-graphite hover:text-kmp-orange"
                      >
                        {c.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {c.visto_atual_subclasse ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {formatDate(c.visto_atual_validade!)}
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/80">
                      {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${VISA_URGENCY_COLORS[c.urgencia]}`}
                      >
                        {VISA_URGENCY_LABELS[c.urgencia]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {semData.length > 0 ? (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-kmp-graphite/60">
            Sem data de vencimento cadastrada ({semData.length})
          </h2>
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full min-w-[400px] text-left text-sm">
              <tbody>
                {semData.map((c) => (
                  <tr key={c.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium text-kmp-graphite hover:text-kmp-orange"
                      >
                        {c.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-kmp-graphite/60">
                      Visto atual não cadastrado
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
