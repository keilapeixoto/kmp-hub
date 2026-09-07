import Link from "next/link";
import type { ConsultationForm } from "@/lib/consultation-forms/types";
import { createConsultationForm } from "../../fichas/actions";

export function FichasPanel({
  clientId,
  fichas,
}: {
  clientId: string;
  fichas: ConsultationForm[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <form action={createConsultationForm}>
          <input type="hidden" name="client_id" value={clientId} />
          <button
            type="submit"
            className="rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Nova ficha
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        {fichas.length === 0 ? (
          <p className="p-6 text-center text-sm text-kmp-graphite/60">
            Nenhuma ficha de consulta registrada para este cliente ainda.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {fichas.map((f) => (
              <li key={f.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <Link
                    href={`/fichas/${f.id}`}
                    className="font-medium text-kmp-graphite hover:text-kmp-orange"
                  >
                    {f.data.clientNames || "Ficha de consulta"}
                  </Link>
                  <p className="text-kmp-graphite/60">
                    {new Date(f.consult_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {f.ai_pending_sections.length > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    IA — revisar
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
