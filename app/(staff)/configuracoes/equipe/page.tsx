import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { getTeamMembers } from "@/lib/team/data";
import { ROLE_LABELS } from "@/lib/team/types";

export default async function TeamPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const members = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-kmp-graphite">Equipe</h1>
          <p className="text-sm text-kmp-graphite/60">
            Usuários com acesso ao painel (não inclui clientes do portal).
          </p>
        </div>
        <Link
          href="/configuracoes/equipe/novo"
          className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Novo usuário
        </Link>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {members.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {members.map((m) => (
              <li key={m.userId}>
                <Link
                  href={`/configuracoes/equipe/${m.userId}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-black/[0.02]"
                >
                  <span className="flex items-center gap-3">
                    {m.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.fotoUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kmp-graphite/10 text-xs font-medium text-kmp-graphite/60">
                        {m.nome.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <span className="font-medium text-kmp-graphite">
                        {m.nome}
                      </span>
                      {m.cargo ? (
                        <span className="ml-2 text-xs text-kmp-graphite/50">
                          {m.cargo}
                        </span>
                      ) : null}
                      <br />
                      <span className="text-xs text-kmp-graphite/50">
                        {m.email}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-kmp-graphite/10 px-2.5 py-1 text-xs font-medium text-kmp-graphite/70">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    {!m.ativo ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                        Inativo
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
