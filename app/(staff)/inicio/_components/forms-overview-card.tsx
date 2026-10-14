import Link from "next/link";

export function FormsOverviewCard({ aguardando, enviados }: { aguardando: number; enviados: number }) {
  return (
    <div className="rounded-lg bg-kmp-surface p-5 shadow-sm">
      <h2 className="font-heading text-base text-kmp-text">Formulários dos clientes</h2>
      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-kmp-text/60">Aguardando o cliente</dt>
          <dd className="text-2xl font-semibold text-kmp-text">{aguardando}</dd>
        </div>
        <div>
          <dt className="text-xs text-kmp-text/60">Enviados para revisar</dt>
          <dd className="text-2xl font-semibold text-kmp-orange">{enviados}</dd>
        </div>
      </dl>
      <Link
        href="/processos"
        className="mt-3 inline-block text-xs text-kmp-text/60 underline hover:text-kmp-orange"
      >
        Ver processos
      </Link>
    </div>
  );
}
