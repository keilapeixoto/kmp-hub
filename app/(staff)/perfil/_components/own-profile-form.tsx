"use client";

import { useActionState } from "react";
import type { TeamMember } from "@/lib/team/types";
import {
  updateOwnProfile,
  type SelfProfileState,
} from "../../configuracoes/equipe/actions";

const INITIAL_STATE: SelfProfileState = { error: null };

export function OwnProfileForm({ member }: { member: TeamMember }) {
  const [state, formAction, pending] = useActionState(
    updateOwnProfile,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Como você quer ser chamado(a)
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
