import { CASE_STATUS_LABELS } from "@/lib/cases/constants";
import type { CaseStatusHistoryEntry } from "@/lib/cases/types";

function displayValue(campo: "status" | "etapa", value: string | null) {
  if (!value) return "—";
  return campo === "status" ? (CASE_STATUS_LABELS[value] ?? value) : value;
}

export function CaseHistory({ events }: { events: CaseStatusHistoryEntry[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-kmp-graphite/60">
        Nenhuma mudança registrada ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-kmp-orange/30 pl-4">
          <p className="text-xs uppercase tracking-wide text-kmp-graphite/50">
            {event.campo === "status" ? "Status" : "Etapa"} ·{" "}
            {new Date(event.created_at).toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-sm text-kmp-graphite">
            {displayValue(event.campo, event.de)} →{" "}
            {displayValue(event.campo, event.para)}
          </p>
        </li>
      ))}
    </ol>
  );
}
