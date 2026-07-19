import Link from "next/link";

const TABS = [
  { slug: "resumo", label: "Resumo" },
  { slug: "dados", label: "Dados" },
  { slug: "documentos", label: "Documentos" },
  { slug: "dependentes", label: "Dependentes" },
  { slug: "processos", label: "Processos" },
  { slug: "linha-do-tempo", label: "Linha do tempo" },
] as const;

export function ClientTabs({
  clientId,
  active,
}: {
  clientId: string;
  active: string;
}) {
  return (
    <div className="flex gap-2 border-b border-black/10 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.slug}
          href={`/clientes/${clientId}?tab=${t.slug}`}
          className={`px-3 py-2 font-medium ${
            active === t.slug
              ? "border-b-2 border-kmp-orange text-kmp-graphite"
              : "text-kmp-graphite/60 hover:text-kmp-orange"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
