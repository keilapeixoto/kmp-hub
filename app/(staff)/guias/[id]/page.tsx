import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getServiceTypes } from "@/lib/cases/data";
import { getGuide, getGuideVersions } from "@/lib/guides/data";
import { archiveGuide, updateGuide } from "../actions";
import { GuideForm } from "../_components/guide-form";

export default async function GuiaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const guide = await getGuide(id);
  if (!guide) notFound();

  const [role, versions, serviceTypes] = await Promise.all([
    getCurrentUserRole(),
    getGuideVersions(id),
    getServiceTypes(),
  ]);
  const isAdmin = role === "admin";

  const updateWithId = updateGuide.bind(null, id);
  const archiveWithId = archiveGuide.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/guias"
            className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
          >
            ← Guias
          </Link>
          <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
            {guide.titulo}
          </h1>
          <p className="mt-1 text-xs text-kmp-graphite/50">
            Versão {guide.versao}
            {guide.status === "arquivado" ? " · arquivado" : ""}
          </p>
        </div>
        {isAdmin && guide.status === "ativo" ? (
          <form action={archiveWithId}>
            <button
              type="submit"
              className="text-sm text-kmp-graphite/60 transition hover:text-red-600"
            >
              Arquivar guia
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
          {isAdmin ? (
            <GuideForm
              action={updateWithId}
              guide={guide}
              serviceTypes={serviceTypes}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-kmp-graphite">
              {guide.conteudo}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">
            Histórico de versões
          </h2>
          {versions.length === 0 ? (
            <p className="mt-4 text-sm text-kmp-graphite/60">
              Ainda na primeira versão.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {versions.map((v) => (
                <li key={v.id} className="border-l-2 border-kmp-orange/30 pl-3">
                  <p className="text-xs text-kmp-graphite/50">
                    Versão {v.versao} ·{" "}
                    {new Date(v.created_at).toLocaleString("pt-BR")}
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-kmp-orange">
                      Ver conteúdo
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap rounded-md bg-black/5 p-3 text-xs text-kmp-graphite/80">
                      {v.conteudo}
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
