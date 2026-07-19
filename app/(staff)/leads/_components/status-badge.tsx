import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-kmp-graphite/10 px-2.5 py-0.5 text-xs font-medium text-kmp-graphite">
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function InactivityBadge({ days }: { days: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-kmp-orange/10 px-2.5 py-0.5 text-xs font-medium text-kmp-orange"
      title={`Sem contato há ${days} dias`}
    >
      ⚠ {days}d
    </span>
  );
}
