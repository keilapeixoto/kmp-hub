"use client";

import { useActionState } from "react";
import type { StorageSettings } from "@/lib/storage-admin/types";
import { updateStorageSettings } from "../actions";

const INITIAL_STATE = { error: null, saved: false };

export function SettingsForm({ settings }: { settings: StorageSettings }) {
  const [state, formAction, pending] = useActionState(
    updateStorageSettings,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Tamanho máximo por arquivo (MB)
        </label>
        <input
          type="number"
          name="max_file_size_mb"
          step="1"
          min="1"
          defaultValue={Math.round(settings.max_file_size_bytes / 1024 / 1024)}
          className="mt-1 w-40 rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Aviso de arquivo grande (MB) — só informa, nunca comprime
        </label>
        <input
          type="number"
          name="large_file_warning_mb"
          step="1"
          min="1"
          defaultValue={Math.round(
            settings.large_file_warning_bytes / 1024 / 1024,
          )}
          className="mt-1 w-40 rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Formatos permitidos (separados por vírgula)
        </label>
        <textarea
          name="allowed_extensions"
          rows={2}
          defaultValue={settings.allowed_extensions.join(", ")}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Níveis de alerta (% separados por vírgula)
        </label>
        <input
          type="text"
          name="alert_thresholds_pct"
          defaultValue={settings.alert_thresholds_pct.join(", ")}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          E-mails que recebem os alertas (um por linha ou por vírgula)
        </label>
        <textarea
          name="alert_emails"
          rows={3}
          defaultValue={settings.alert_emails.join("\n")}
          placeholder="ex.: admin@kmpconsulting.com.au"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Limite interno de armazenamento (GB)
        </label>
        <input
          type="number"
          name="internal_limit_gb"
          step="1"
          min="1"
          defaultValue={Math.round(
            settings.internal_limit_bytes / 1024 / 1024 / 1024,
          )}
          className="mt-1 w-40 rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-kmp-graphite">
          Prazo para revisão de processos arquivados (dias)
        </label>
        <input
          type="number"
          name="archived_case_review_days"
          step="1"
          min="1"
          defaultValue={settings.archived_case_review_days}
          className="mt-1 w-40 rounded-md border border-black/10 px-3 py-2 text-sm text-kmp-graphite"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.saved ? (
        <p className="text-sm text-green-700">Configurações salvas.</p>
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
