import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getCaseStages, getServiceType } from "@/lib/cases/data";
import { createChecklistTemplate } from "../../checklists/actions";
import { updateServiceType } from "../actions";
import { CaseStagesPanel } from "../_components/case-stages-panel";
import { ServiceTypeForm } from "../_components/service-type-form";
import { ArchiveServiceTypeButton } from "../_components/archive-service-type-button";
import { DuplicateServiceTypeButton } from "../_components/duplicate-service-type-button";

export default async function ServiceTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const serviceType = await getServiceType(id);
  if (!serviceType) notFound();

  const [role, stages] = await Promise.all([
    getCurrentUserRole(),
    getCaseStages(id),
  ]);
  const isAdmin = role === "admin";

  const updateWithId = updateServiceType.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes/servicos"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Tipos de serviço
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-heading text-2xl text-kmp-graphite">
            {serviceType.nome}
            {serviceType.arquivado ? (
              <span className="ml-3 rounded-full bg-black/5 px-2.5 py-0.5 align-middle text-xs font-medium text-kmp-graphite/60">
                Arquivada
              </span>
            ) : null}
          </h1>
          {isAdmin ? (
            <div className="flex items-center gap-4">
              <DuplicateServiceTypeButton id={id} />
              <ArchiveServiceTypeButton
                id={id}
                arquivado={serviceType.arquivado}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-graphite">Dados</h2>
          <div className="mt-4">
            {isAdmin ? (
              <ServiceTypeForm action={updateWithId} serviceType={serviceType} />
            ) : (
              <p className="text-sm text-kmp-graphite/80">
                {serviceType.descricao ?? "Sem descrição."}
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
            Etapas do pipeline
          </h2>
          <CaseStagesPanel
            serviceTypeId={id}
            stages={stages}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg text-kmp-graphite">
          Checklist
        </h2>
        {serviceType.checklist_template_id ? (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <Link
              href={`/configuracoes/checklists/${serviceType.checklist_template_id}`}
              className="text-sm font-medium text-kmp-orange hover:underline"
            >
              Gerenciar itens do checklist →
            </Link>
          </div>
        ) : isAdmin ? (
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-kmp-graphite/60">
              Este tipo de serviço ainda não tem um template de checklist.
            </p>
            <form
              action={createChecklistTemplate.bind(null, id)}
              className="mt-4 flex items-end gap-2"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-kmp-graphite">
                  Nome do template
                </label>
                <input
                  name="nome"
                  required
                  defaultValue={`Checklist ${serviceType.nome}`}
                  className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Criar
              </button>
            </form>
          </div>
        ) : (
          <p className="rounded-lg bg-white p-6 text-sm text-kmp-graphite/60 shadow-sm">
            Nenhum template de checklist configurado.
          </p>
        )}
      </div>
    </div>
  );
}
