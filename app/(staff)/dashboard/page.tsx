import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, idioma, roles(nome)")
    .eq("user_id", user.id)
    .single();

  const funcao = Array.isArray(profile?.roles)
    ? profile?.roles[0]?.nome
    : (profile?.roles as { nome: string } | null | undefined)?.nome;

  return (
    <div>
      <h1 className="font-heading text-2xl text-kmp-graphite">
        Bem-vindo(a){profile?.nome ? `, ${profile.nome}` : ""}
      </h1>
      <dl className="mt-6 space-y-2 text-sm text-kmp-graphite/80">
        <div>
          <dt className="inline font-medium">E mail: </dt>
          <dd className="inline">{user.email}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Função: </dt>
          <dd className="inline">{funcao ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Idioma: </dt>
          <dd className="inline">{profile?.idioma ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
