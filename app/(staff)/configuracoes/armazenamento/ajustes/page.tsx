import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getStorageSettings } from "@/lib/storage-admin/data";
import { SettingsForm } from "./_components/settings-form";

export default async function StorageSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  const settings = await getStorageSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Ajustes de armazenamento
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          O bloqueio de formatos perigosos (executáveis, scripts) é sempre
          aplicado no código, independente do que estiver aqui.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
