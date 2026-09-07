import { notFound } from "next/navigation";
import { getConsultationForm } from "@/lib/consultation-forms/data";
import { EMPTY_CONSULTATION_DATA } from "@/lib/consultation-forms/types";
import { FichaEditor } from "../_components/ficha-editor";

export default async function FichaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await getConsultationForm(id);
  if (!ficha) notFound();

  return (
    <FichaEditor
      formId={ficha.id}
      clientId={ficha.client_id}
      initialData={{ ...EMPTY_CONSULTATION_DATA, ...ficha.data }}
      initialPendingSections={ficha.ai_pending_sections}
    />
  );
}
