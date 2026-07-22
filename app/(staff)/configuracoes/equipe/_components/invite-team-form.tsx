"use client";

import { useActionState } from "react";
import { STAFF_ROLES } from "@/lib/team/types";
import { inviteTeamMember, type TeamFormState } from "../actions";

const INITIAL_STATE: TeamFormState = { error: null };

export function InviteTeamForm() {
  const [state, formAction, pending] = useActionState(
    inviteTeamMember,
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
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          E-mail
        </label>
        <input
          type="email"
          name="email"
          required
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Função (nível de acesso)
        </label>
        <select
          name="role"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        >
          <option value="" disabled>
            Selecione
          </option>
          {STAFF_ROLES.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Enviando convite…" : "Enviar convite"}
      </button>
    </form>
  );
}
