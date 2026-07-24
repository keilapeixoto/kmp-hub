import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getCaseStatusLabelRows } from "@/lib/cases/data";
import { StatusLabelsForm } from "./_components/status-labels-form";

export default async function ProcessosSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  const labels = await getCaseStatusLabelRows();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Nomes de status de processos
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          Textos exibidos nas colunas da Pipeline, na tabela de processos e no
          histórico. As etapas de cada tipo de serviço são configuradas em
          Tipos de serviço, não aqui.
        </p>
      </div>

      <StatusLabelsForm labels={labels} />
    </div>
  );
}
