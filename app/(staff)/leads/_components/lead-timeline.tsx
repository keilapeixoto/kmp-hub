import type { LeadEvent } from "@/lib/leads/types";

const TIPO_LABELS: Record<LeadEvent["tipo"], string> = {
  criacao: "Cadastro",
  mudanca_status: "Mudança de status",
  atribuicao: "Reatribuição",
  contato: "Contato",
  observacao: "Observação",
};

export function LeadTimeline({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-kmp-text/50">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-kmp-orange/30 pl-4">
          <p className="text-xs uppercase tracking-wide text-kmp-text/40">
            {TIPO_LABELS[event.tipo] ?? event.tipo} ·{" "}
            {new Date(event.created_at).toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 text-sm text-kmp-text/90">
            {event.descricao}
          </p>
        </li>
      ))}
    </ol>
  );
}
