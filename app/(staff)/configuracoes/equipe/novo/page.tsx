import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { InviteTeamForm } from "../_components/invite-team-form";

export default async function NewTeamMemberPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Novo usuário
        </h1>
        <p className="text-sm text-kmp-graphite/60">
          A pessoa recebe um e-mail de convite para definir a senha e acessar
          o painel.
        </p>
      </div>

      <InviteTeamForm />
    </div>
  );
}
