/**
 * Estrutura de rota reservada para o portal do cliente (Fase 2 do plano).
 * Login por magic link entra junto com o restante do portal — não faz parte
 * do Sprint 1, que cobre só a autenticação da equipe.
 */
export default function PortalLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-3xl text-kmp-graphite">KMP Hub</h1>
        <p className="mt-1 text-sm text-kmp-graphite/70">Portal do cliente</p>
        <p className="mt-6 text-sm text-kmp-graphite/70">
          O acesso do portal chega na Fase 2 do projeto, junto com o login por
          magic link.
        </p>
      </div>
    </main>
  );
}
