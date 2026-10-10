import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { getServiceTypes } from "@/lib/cases/data";

export default async function ServiceTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  const sp = await searchParams;
  const mostrarArquivados = sp.arquivados === "1";

  const [role, allServiceTypes] = await Promise.all([
    getCurrentUserRole(),
    getServiceTypes(),
  ]);
  const isAdmin = role === "admin";

  const serviceTypes = mostrarArquivados
    ? allServiceTypes
    : allServiceTypes.filter((st) => !st.arquivado);
  const arquivadosCount = allServiceTypes.filter((st) => st.arquivado).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Tipos de serviço (pipelines)
        </h1>
        {isAdmin ? (
          <Link
            href="/configuracoes/servicos/novo"
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Novo tipo de serviço
          </Link>
        ) : null}
      </div>

      {arquivadosCount > 0 ? (
        <Link
          href={
            mostrarArquivados
              ? "/configuracoes/servicos"
              : "/configuracoes/servicos?arquivados=1"
          }
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          {mostrarArquivados
            ? "Esconder arquivadas"
            : `Mostrar arquivadas (${arquivadosCount})`}
        </Link>
      ) : null}

      <div className="rounded-lg border border-kmp-config/40 bg-gradient-to-br from-kmp-panel to-kmp-panel-deep shadow-md shadow-kmp-config/20">
        {serviceTypes.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/50">
            Nenhum tipo de serviço cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {serviceTypes.map((st) => (
              <li key={st.id} className="p-4 text-sm">
                <Link
                  href={`/configuracoes/servicos/${st.id}`}
                  className="font-medium text-white hover:text-kmp-orange"
                >
                  {st.nome}
                </Link>
                {st.arquivado ? (
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                    Arquivada
                  </span>
                ) : null}
                {st.descricao ? (
                  <p className="mt-1 text-white/50">{st.descricao}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
