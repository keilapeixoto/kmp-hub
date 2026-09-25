import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth";
import { OCCUPATION_CATEGORIES } from "@/lib/occupations/constants";
import { ImportForm } from "./_components/import-form";

export default async function ImportarOcupacoesPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-graphite">
          Importar ocupações
        </h1>
        <p className="mt-1 text-sm text-kmp-graphite/60">
          Colunas esperadas, nessa ordem, com cabeçalho na primeira linha:
          nome, codigo_anzsco, categoria, autoridade_avaliadora,
          nivel_habilidade, na_csol, na_mltssl_legada, fonte. Categorias
          válidas: {OCCUPATION_CATEGORIES.join(", ")}. Ocupações existentes
          (mesmo código ANZSCO) são atualizadas; novas são criadas. O
          separador é vírgula simples — nomes ou autoridades com vírgula no
          texto não são suportados.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
