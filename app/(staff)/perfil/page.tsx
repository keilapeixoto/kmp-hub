import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/data";
import { AvatarUploadForm } from "../configuracoes/equipe/_components/avatar-upload-form";
import { OwnProfileForm } from "./_components/own-profile-form";
import { SignatureForm } from "./_components/signature-form";
import { getMinhaAssinatura } from "@/lib/email/dados";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await getTeamMember(user.id);
  if (!member) redirect("/dashboard");
  const assinatura = await getMinhaAssinatura(user.id, member.nome);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-text">
          Meu perfil
        </h1>
        <p className="text-sm text-kmp-text/60">{member.email}</p>
      </div>

      <div className="rounded-3xl bg-kmp-surface p-6 shadow-sm">
        <AvatarUploadForm userId={member.userId} fotoUrl={member.fotoUrl} />
      </div>

      <OwnProfileForm member={member} />

      <SignatureForm atual={assinatura} />
    </div>
  );
}
