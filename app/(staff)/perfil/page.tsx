import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/data";
import { AvatarUploadForm } from "../configuracoes/equipe/_components/avatar-upload-form";
import { OwnProfileForm } from "./_components/own-profile-form";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await getTeamMember(user.id);
  if (!member) redirect("/dashboard");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Meu perfil
        </h1>
        <p className="text-sm text-kmp-graphite/60">{member.email}</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AvatarUploadForm userId={member.userId} fotoUrl={member.fotoUrl} />
      </div>

      <OwnProfileForm member={member} />
    </div>
  );
}
