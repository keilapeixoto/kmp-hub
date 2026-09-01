import { getClientsWithActiveVisa, type VisaPanelRow } from "@/lib/vencimentos/data";
import { visaUrgency } from "@/lib/clients/utils";
import { VencimentosFilters } from "./_components/vencimentos-filters";
import {
  VencimentosKanban,
  BUCKET_ORDER,
} from "./_components/vencimentos-kanban";
import type { VisaBucket } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VencimentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const busca = firstValue(params.busca)?.trim().toLowerCase() ?? "";

  const clients = await getClientsWithActiveVisa();
  const buscados = busca
    ? clients.filter((c) => c.nome.toLowerCase().includes(busca))
    : clients;

  const buckets: Record<VisaBucket, VisaPanelRow[]> = {
    vencido: [],
    critico: [],
    atencao: [],
    monitorar: [],
    sem_urgencia: [],
    sem_data: [],
  };

  for (const client of buscados) {
    if (!client.visto_atual_validade) {
      buckets.sem_data.push(client);
      continue;
    }
    const urgencia = visaUrgency(
      client.visto_atual_validade,
      client.visto_alerta_limite_dias,
    );
    buckets[urgencia].push(client);
  }

  for (const key of BUCKET_ORDER) {
    buckets[key].sort((a, b) =>
      key === "sem_data"
        ? a.nome.localeCompare(b.nome)
        : (a.visto_atual_validade ?? "").localeCompare(b.visto_atual_validade ?? ""),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Vencimento de vistos
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          Clientes com processo em andamento. Arraste um cliente para outra
          coluna para reclassificar rapidamente — para o vencimento exato,
          edite pelo cadastro do cliente.
        </p>
      </div>

      <VencimentosFilters busca={busca} />

      <VencimentosKanban buckets={buckets} />
    </div>
  );
}
