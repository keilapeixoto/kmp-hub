import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getCaseStages, getServiceType } from "@/lib/cases/data";
import { createChecklistTemplate } from "../../checklists/actions";
import { updateServiceType } from "../actions";
import { StagesEditor } from "@/app/(staff)/processos/_components/stages-editor";
import { getStageTasks } from "@/lib/cases/stage-tasks";
import { createClient } from "@/lib/supabase/server";
import { ServiceTypeForm } from "../_components/service-type-form";
import { ArchiveServiceTypeButton } from "../_components/archive-service-type-button";
import { DuplicateServiceTypeButton } from "../_components/duplicate-service-type-button";

export default async function ServiceTypeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const etapaErro = typeof sp.etapaErro === "string" ? sp.etapaErro : null;

  const serviceType = await getServiceType(id);
  if (!serviceType) notFound();

  const [role, stages] = await Promise.all([
    getCurrentUserRole(),
    getCaseStages(id),
  ]);
  const isAdmin = role === "admin";
  const supabase = await createClient();
  const [stageTasks, { data: casos }] = await Promise.all([
    getStageTasks(stages.map((st) => st.id)),
    stages.length
      ? supabase.from("cases").select("etapa_id").in("etapa_id", stages.map((st) => st.id))
      : Promise.resolve({ data: [] as { etapa_id: string | null }[] }),
  ]);
  const contagem = ((casos ?? []) as { etapa_id: string | null }[]).reduce<Record<string, number>>((acc, c) => {
    if (c.etapa_id) acc[c.etapa_id] = (acc[c.etapa_id] ?? 0) + 1;
    return acc;
  }, {});

  const updateWithId = updateServiceType.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes/servicos"
          className="text-sm text-kmp-text/60 hover:text-kmp-orange"
        >
          ← Tipos de serviço
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-heading text-2xl text-kmp-text">
            {serviceType.nome}
            {serviceType.arquivado ? (
              <span className="ml-3 rounded-full bg-kmp-divider px-2.5 py-0.5 align-middle text-xs font-medium text-kmp-text/60">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-fit rounded-3xl bg-kmp-surface p-6 shadow-sm">
          <h2 className="font-heading text-lg text-kmp-text">Dados</h2>
          <div className="mt-4">
            {isAdmin ? (
              <ServiceTypeForm action={updateWithId} serviceType={serviceType} />
            ) : (
              <p className="text-sm text-kmp-text/80">
                {serviceType.descricao ?? "Sem descrição."}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-4 font-heading text-lg text-kmp-text">
            Etapas do pipeline
          </h2>
          {isAdmin ? (
            <StagesEditor
              serviceTypeId={id}
              stages={stages}
              contagem={contagem}
              erro={etapaErro}
              aberto
              stageTasks={stageTasks}
              naConfiguracao
            />
          ) : (
            <ol className="space-y-2 rounded-3xl bg-kmp-surface p-4 text-sm text-kmp-text shadow-sm">
              {stages.map((st, i) => (
                <li key={st.id}>
                  {i + 1}. {st.nome}
                </li>
              ))}
              <li className="pt-2 text-xs text-kmp-text/60">Só admin edita as etapas.</li>
            </ol>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-heading text-lg text-kmp-text">
          Checklist
        </h2>
        {serviceType.checklist_template_id ? (
          <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
            <Link
              href={`/configuracoes/checklists/${serviceType.checklist_template_id}`}
              className="text-sm font-medium text-kmp-orange hover:underline"
            >
              Gerenciar itens do checklist →
            </Link>
          </div>
        ) : isAdmin ? (
          <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
            <p className="text-sm text-kmp-text/60">
              Este tipo de serviço ainda não tem um template de checklist.
            </p>
            <form
              action={createChecklistTemplate.bind(null, id)}
              className="mt-4 flex items-end gap-2"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-kmp-text">
                  Nome do template
                </label>
                <input
                  name="nome"
                  required
                  defaultValue={`Checklist ${serviceType.nome}`}
                  className="mt-1 w-full rounded-md border border-kmp-divider px-3 py-2 text-sm text-kmp-text focus:border-kmp-orange focus:outline-none focus:ring-1 focus:ring-kmp-orange"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-kmp-primary px-4 py-2 text-sm font-medium text-kmp-on-primary transition hover:opacity-90"
              >
                Criar
              </button>
            </form>
          </div>
        ) : (
          <p className="rounded-3xl bg-kmp-surface p-6 text-sm text-kmp-text/50 shadow-sm">
            Nenhum template de checklist configurado.
          </p>
        )}
      </div>
    </div>
  );
}
