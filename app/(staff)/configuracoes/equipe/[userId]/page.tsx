import { notFound, redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/team/data";
import { EditTeamMemberForm } from "../_components/edit-team-member-form";
import { AvatarUploadForm } from "../_components/avatar-upload-form";
import { DeleteTeamMemberButton } from "../_components/delete-team-member-button";

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const member = await getTeamMember(userId);
  if (!member) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === member.userId;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-kmp-graphite">
            {member.nome}
          </h1>
          <p className="text-sm text-kmp-graphite/60">{member.email}</p>
        </div>
        {!isSelf ? (
          <DeleteTeamMemberButton userId={member.userId} nome={member.nome} />
        ) : null}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <AvatarUploadForm userId={member.userId} fotoUrl={member.fotoUrl} />
      </div>

      <EditTeamMemberForm member={member} />
    </div>
  );
}
