import { getClientsWithActiveVisa } from "@/lib/vencimentos/data";
import { visaUrgency } from "@/lib/clients/utils";
import {
  VISA_URGENCY_COLORS,
  VISA_URGENCY_LABELS,
  type VisaUrgency,
} from "@/lib/clients/constants";
import { VencimentosFilters } from "./_components/vencimentos-filters";
import { VencimentosTable } from "./_components/vencimentos-table";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const URGENCY_ORDER: VisaUrgency[] = [
  "vencido",
  "critico",
  "atencao",
  "monitorar",
  "sem_urgencia",
];

export default async function VencimentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const busca = firstValue(params.busca)?.trim().toLowerCase() ?? "";
  const statusFiltro = firstValue(params.status) as VisaUrgency | undefined;

  const clients = await getClientsWithActiveVisa();

  const buscados = busca
    ? clients.filter((c) => c.nome.toLowerCase().includes(busca))
    : clients;

  const comData = buscados
    .filter((c) => c.visto_atual_validade)
    .map((c) => ({
      ...c,
      urgencia: visaUrgency(c.visto_atual_validade!, c.visto_alerta_limite_dias),
    }))
    .sort((a, b) => a.visto_atual_validade!.localeCompare(b.visto_atual_validade!));

  const semData = buscados
    .filter((c) => !c.visto_atual_validade)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const contagens = URGENCY_ORDER.reduce(
    (acc, key) => {
      acc[key] = comData.filter((c) => c.urgencia === key).length;
      return acc;
    },
    {} as Record<VisaUrgency, number>,
  );

  const comDataFiltrado = statusFiltro
    ? comData.filter((c) => c.urgencia === statusFiltro)
    : comData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Vencimento de vistos
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          Clientes com processo em andamento, ordenados pelo vencimento do
          visto atual.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {URGENCY_ORDER.map((key) => (
          <span
            key={key}
            className={`rounded-full px-3 py-1 text-xs font-medium ${VISA_URGENCY_COLORS[key]}`}
          >
            {contagens[key]} {VISA_URGENCY_LABELS[key].toLowerCase()}
          </span>
        ))}
      </div>

      <VencimentosFilters busca={busca} status={statusFiltro} />

      <VencimentosTable comData={comDataFiltrado} semData={semData} />
    </div>
  );
}
