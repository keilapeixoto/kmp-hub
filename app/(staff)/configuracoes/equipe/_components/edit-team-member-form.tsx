"use client";

import { useActionState } from "react";
import { STAFF_ROLES, type TeamMember } from "@/lib/team/types";
import { updateTeamMember, type TeamFormState } from "../actions";

const INITIAL_STATE: TeamFormState = { error: null };

export function EditTeamMemberForm({ member }: { member: TeamMember }) {
  const updateWithId = updateTeamMember.bind(null, member.userId);
  const [state, formAction, pending] = useActionState(
    updateWithId,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Nome
        </label>
        <input
          type="text"
          name="nome"
          required
          defaultValue={member.nome}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Cargo
        </label>
        <input
          type="text"
          name="cargo"
          defaultValue={member.cargo ?? ""}
          placeholder="ex.: Consultora de Imigração"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Telefone
        </label>
        <input
          type="tel"
          name="telefone"
          defaultValue={member.telefone ?? ""}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Função (nível de acesso)
        </label>
        <select
          name="role"
          defaultValue={member.role}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        >
          {STAFF_ROLES.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-kmp-graphite">
        <input type="checkbox" name="ativo" defaultChecked={member.ativo} />
        Usuário ativo
      </label>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
