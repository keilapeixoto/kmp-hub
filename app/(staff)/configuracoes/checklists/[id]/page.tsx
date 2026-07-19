import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import {
  getChecklistTemplate,
  getChecklistTemplateItems,
} from "@/lib/checklists/data";
import { getServiceType } from "@/lib/cases/data";
import { TemplateItemsPanel } from "../_components/template-items-panel";

export default async function ChecklistTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await getChecklistTemplate(id);
  if (!template) notFound();

  const [role, items, serviceType] = await Promise.all([
    getCurrentUserRole(),
    getChecklistTemplateItems(id),
    getServiceType(template.service_type_id),
  ]);
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/configuracoes/servicos/${template.service_type_id}`}
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← {serviceType?.nome ?? "Tipo de serviço"}
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          {template.nome}
        </h1>
      </div>

      <TemplateItemsPanel templateId={id} items={items} isAdmin={isAdmin} />
    </div>
  );
}
