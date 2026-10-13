import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth";
import { getGoogleConnection } from "@/lib/google/connections";
import { GoogleLogo } from "@/app/(staff)/_components/brand-icons";
import { DisconnectGoogleButton } from "./_components/disconnect-google-button";

const ERROR_MESSAGES: Record<string, string> = {
  state_invalido: "A conexão expirou ou foi iniciada de outro lugar — tente de novo.",
  sem_refresh_token: "O Google não devolveu permissão de acesso contínuo — tente de novo.",
  falha_na_troca_de_token: "Não foi possível concluir a conexão com o Google — tente de novo.",
};

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "director") {
    redirect("/dashboard");
  }

  const { conectado, erro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const connection = user ? await getGoogleConnection(user.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-kmp-text">Integrações</h1>
        <p className="text-sm text-kmp-text/60">
          Conecte sua conta Google pra ver sua agenda real e e-mails não
          lidos no Início, e mandar e-mail de dentro do Hub pelo seu Gmail.
        </p>
      </div>

      {conectado ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Conta Google conectada com sucesso.
        </div>
      ) : null}
      {erro ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {ERROR_MESSAGES[erro] ?? "Não foi possível conectar — tente de novo."}
        </div>
      ) : null}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kmp-orange/10">
              <GoogleLogo className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg text-kmp-graphite">
                Google (Calendar + Gmail)
              </h2>
              {connection ? (
                <p className="mt-1 text-sm text-kmp-graphite/60">
                  Conectado como{" "}
                  <span className="font-medium">
                    {connection.googleEmail ?? "conta Google"}
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-1 text-sm text-kmp-graphite/60">
                  Não conectado. Sem conexão, a agenda e os e-mails não
                  aparecem no Início.
                </p>
              )}
            </div>
          </div>
          {connection ? (
            <DisconnectGoogleButton />
          ) : (
            <a
              href="/api/google/connect"
              className="flex shrink-0 items-center gap-2 rounded-md bg-kmp-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <GoogleLogo className="h-4 w-4" />
              Conectar
            </a>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-md bg-kmp-graphite/5 p-3 text-xs text-kmp-graphite/60">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Pedimos acesso de leitura à agenda, leitura de não lidos e envio
            de e-mail — nunca excluímos ou alteramos nada na sua conta
            Google. O token fica guardado só no servidor, nunca é exposto ao
            navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
