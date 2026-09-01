import Link from "next/link";
import { VISA_URGENCY_LABELS, type VisaUrgency } from "@/lib/clients/constants";

const URGENCY_OPTIONS: VisaUrgency[] = [
  "vencido",
  "critico",
  "atencao",
  "monitorar",
  "sem_urgencia",
];

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 px-2 py-1.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange";
const labelClass = "block text-xs font-medium text-kmp-graphite/70";

export function VencimentosFilters({
  busca,
  status,
}: {
  busca: string;
  status: VisaUrgency | undefined;
}) {
  return (
    <form
      method="GET"
      className="grid grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-4"
    >
      <div>
        <label className={labelClass}>Buscar por nome</label>
        <input
          type="text"
          name="busca"
          defaultValue={busca}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Status</label>
        <select name="status" defaultValue={status ?? ""} className={inputClass}>
          <option value="">Todos</option>
          {URGENCY_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {VISA_URGENCY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2 flex items-end gap-2">
        <button
          type="submit"
          className="rounded-md bg-kmp-orange px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href="/vencimentos"
          className="rounded-md px-4 py-1.5 text-sm font-medium text-kmp-graphite/70 transition hover:text-kmp-orange"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
