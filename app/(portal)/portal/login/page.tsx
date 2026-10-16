import { getIdiomaDoPortal } from "@/lib/portal/idioma";
import { tradutor } from "@/lib/portal/i18n";
import { IdiomaToggle } from "../_components/idioma-toggle";
import { PortalBrand } from "../_components/portal-brand";
import { PortalLoginForm } from "../_components/portal-login-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const expirado = sp.link === "expirado";
  const idioma = await getIdiomaDoPortal();
  const t = tradutor(idioma);
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-kmp-surface p-8 shadow-sm">
        <div className="flex justify-end">
          <IdiomaToggle idioma={idioma} rotulo={t("nav.idioma")} />
        </div>
        <div className="mt-2 flex justify-center">
          <PortalBrand grande />
        </div>
        <h1 className="mt-8 text-center font-heading text-2xl font-semibold text-kmp-text">{t("login.titulo")}</h1>
        <p className="mt-1 text-center text-sm text-kmp-text/70">
          {t("login.sub")}
        </p>
        {expirado ? (
          <p className="mt-6 rounded-2xl bg-[#fcf1cf] p-3 text-sm text-[#7a5806]">
            {t("login.expirado")}
          </p>
        ) : null}
        <PortalLoginForm
          textos={{
            email: t("login.email"),
            placeholder: t("login.placeholder"),
            enviar: t("login.enviar"),
            enviando: t("login.enviando"),
            enviado: t("login.enviado"),
          }}
        />
      </div>
    </main>
  );
}
