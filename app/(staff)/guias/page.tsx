import Link from "next/link";
import { getCurrentUserRole } from "@/lib/auth";
import { getServiceTypes } from "@/lib/cases/data";
import { getGuides } from "@/lib/guides/data";

export default async function GuiasPage() {
  const [role, guides, serviceTypes] = await Promise.all([
    getCurrentUserRole(),
    getGuides(),
    getServiceTypes(),
  ]);
  const isAdmin = role === "admin";

  const serviceTypeName = (id: string | null) =>
    id ? (serviceTypes.find((st) => st.id === id)?.nome ?? null) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Guias internos
        </h1>
        {isAdmin ? (
          <Link
            href="/guias/novo"
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Novo guia
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {guides.length === 0 ? (
          <p className="p-8 text-center text-sm text-kmp-graphite/60">
            Nenhum guia cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {guides.map((guide) => (
              <li key={guide.id} className="p-4 text-sm">
                <Link
                  href={`/guias/${guide.id}`}
                  className="font-medium text-kmp-graphite hover:text-kmp-orange"
                >
                  {guide.titulo}
                </Link>
                <p className="mt-1 text-xs text-kmp-graphite/50">
                  Versão {guide.versao}
                  {serviceTypeName(guide.service_type_id)
                    ? ` · ${serviceTypeName(guide.service_type_id)}`
                    : ""}
                  {guide.status === "arquivado" ? " · (arquivado)" : ""}
                  {" · atualizado "}
                  {new Date(guide.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
