import { getCaseStatusLabels } from "@/lib/cases/data";
import type { CaseStatusHistoryEntry } from "@/lib/cases/types";

function displayValue(
  statusLabels: Record<string, string>,
  campo: "status" | "etapa",
  value: string | null,
) {
  if (!value) return "—";
  return campo === "status" ? (statusLabels[value] ?? value) : value;
}

export async function CaseHistory({ events }: { events: CaseStatusHistoryEntry[] }) {
  const statusLabels = await getCaseStatusLabels();
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
            {displayValue(statusLabels, event.campo, event.de)} →{" "}
            {displayValue(statusLabels, event.campo, event.para)}
          </p>
        </li>
      ))}
    </ol>
  );
}
