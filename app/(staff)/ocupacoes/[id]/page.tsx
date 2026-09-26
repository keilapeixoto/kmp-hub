import Link from "next/link";
import { notFound } from "next/navigation";
import { getOccupation } from "@/lib/occupations/data";
import { VISA_SUBCLASSES } from "@/lib/occupations/constants";

export default async function OcupacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const occupation = await getOccupation(id);
  if (!occupation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ocupacoes"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          ← Ocupações
        </Link>
        <h1 className="mt-1 font-heading text-2xl text-kmp-graphite">
          {occupation.nome}
        </h1>
        <p className="mt-1 text-xs text-kmp-graphite/50">
          {occupation.categoria} · Nível de habilidade {occupation.nivel_habilidade}
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <dl className="divide-y divide-black/5 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-kmp-graphite/50">Código ANZSCO</dt>
            <dd className="text-kmp-graphite">{occupation.codigo_anzsco}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-kmp-graphite/50">Autoridade avaliadora</dt>
            <dd className="text-kmp-graphite">
              {occupation.autoridade_avaliadora}
            </dd>
          </div>
          {occupation.fonte ? (
            <div className="flex justify-between py-2">
              <dt className="text-kmp-graphite/50">Fonte</dt>
              <dd className="text-kmp-graphite">{occupation.fonte}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="flex gap-2">
        {occupation.na_csol ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            Na CSOL
          </span>
        ) : null}
        {occupation.na_mltssl_legada ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Na MLTSSL · válido para 485
          </span>
        ) : null}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg text-kmp-graphite">
          Elegibilidade por subclasse de visto
        </h2>
        <p className="mt-1 text-xs text-kmp-graphite/50">
          Referência geral por ocupação — não considera cotas por estado nem
          o histórico de rodadas de convite. Confirme sempre a elegibilidade
          real do caso com a consultora.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VISA_SUBCLASSES.map(({ coluna, codigo, nome }) => {
            const valor = occupation[coluna];
            const estilo =
              valor === true
                ? "bg-green-50 text-green-700"
                : valor === false
                  ? "bg-black/5 text-kmp-graphite/40"
                  : "bg-black/5 text-kmp-graphite/30";
            const rotulo =
              valor === true ? "Elegível" : valor === false ? "Não" : "—";
            return (
              <li
                key={coluna}
                className={`rounded-md px-3 py-2 text-center ${estilo}`}
                title={nome}
              >
                <p className="text-sm font-semibold">{codigo}</p>
                <p className="text-xs">{rotulo}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
