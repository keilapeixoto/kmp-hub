import { PortalBrand } from "../_components/portal-brand";
import { PortalLoginForm } from "../_components/portal-login-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const expirado = sp.link === "expirado";
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-kmp-surface p-8 shadow-sm">
        <div className="flex justify-center">
          <PortalBrand grande />
        </div>
        <h1 className="mt-8 text-center font-heading text-2xl font-semibold text-kmp-text">Portal do cliente</h1>
        <p className="mt-1 text-center text-sm text-kmp-text/70">
          Acompanhe seu processo, envie documentos e preencha seus formulários.
        </p>
        {expirado ? (
          <p className="mt-6 rounded-2xl bg-[#fcf1cf] p-3 text-sm text-[#7a5806]">
            Esse link já foi usado ou expirou. Peça um novo abaixo.
          </p>
        ) : null}
        <PortalLoginForm />
      </div>
    </main>
  );
}
