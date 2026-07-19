import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { getServiceTypes } from "@/lib/cases/data";

export default async function ServiceTypesPage() {
  const [role, serviceTypes] = await Promise.all([
    getCurrentUserRole(),
    getServiceTypes(),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Tipos de serviço
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

      <div className="rounded-lg bg-white shadow-sm">
        {serviceTypes.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhum tipo de serviço cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {serviceTypes.map((st) => (
              <li key={st.id} className="p-4 text-sm">
                <Link
                  href={`/configuracoes/servicos/${st.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {st.nome}
                </Link>
                {st.descricao ? (
                  <p className="mt-1 text-kmp-graphite/60">{st.descricao}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
