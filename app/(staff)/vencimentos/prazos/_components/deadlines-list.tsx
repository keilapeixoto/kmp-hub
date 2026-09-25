import Link from "next/link";
import { daysUntil } from "@/lib/clients/utils";
import { isDeadlineUrgent, needsExtensionLetterAlert } from "@/lib/case-deadlines/utils";
import { REQUEST_TYPE_LABELS } from "@/lib/case-deadlines/constants";
import type { CaseDeadlineWithContext } from "@/lib/case-deadlines/types";
import { DeadlineStatusSelect } from "./deadline-status-select";
import { SendReminderControl } from "./send-reminder-control";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function DeadlinesList({
  deadlines,
  canSend,
}: {
  deadlines: CaseDeadlineWithContext[];
  canSend: boolean;
}) {
  if (deadlines.length === 0) {
    return (
      <p className="rounded-lg bg-white p-8 text-center text-sm text-kmp-graphite/60 shadow-sm">
        Nenhum prazo de 28 dias cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-black/10 text-xs uppercase text-kmp-graphite/60">
          <tr>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Tipo de pedido</th>
            <th className="px-4 py-3 font-medium">Data do pedido</th>
            <th className="px-4 py-3 font-medium">Prazo final</th>
            <th className="px-4 py-3 font-medium">Dias restantes</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {canSend ? <th className="px-4 py-3 font-medium">Lembrete manual</th> : null}
          </tr>
        </thead>
        <tbody>
          {deadlines.map((d) => {
            const dias = daysUntil(d.prazo_final);
            const urgente = isDeadlineUrgent(d);
            const extensao = needsExtensionLetterAlert(d);
            return (
              <tr
                key={d.id}
                className={`border-b border-black/5 last:border-0 ${
                  urgente ? "bg-red-50" : extensao ? "bg-amber-50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  {d.client_id ? (
                    <Link
                      href={`/clientes/${d.client_id}`}
                      className="font-medium text-kmp-graphite hover:text-kmp-orange"
                    >
                      {d.client_nome}
                    </Link>
                  ) : (
                    d.client_nome
                  )}
                </td>
                <td className="px-4 py-3 text-kmp-graphite/80">
                  {REQUEST_TYPE_LABELS[d.tipo_pedido] ?? d.tipo_pedido}
                  {extensao ? (
                    <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                      Preparar carta de extensão
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-kmp-graphite/80">{formatDate(d.data_pedido)}</td>
                <td className="px-4 py-3 text-kmp-graphite/80">{formatDate(d.prazo_final)}</td>
                <td
                  className={`px-4 py-3 font-medium ${urgente ? "text-red-700" : "text-kmp-graphite/80"}`}
                >
                  {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
                </td>
                <td className="px-4 py-3">
                  <DeadlineStatusSelect id={d.id} status={d.status} />
                </td>
                {canSend ? (
                  <td className="px-4 py-3">
                    {d.status === "aguardando_documento" ? (
                      <SendReminderControl deadlineId={d.id} />
                    ) : (
                      <span className="text-xs text-kmp-graphite/40">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
