import { PortalLoginForm } from "../_components/portal-login-form";

export default function PortalLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="font-heading text-3xl text-kmp-graphite">KMP Hub</h1>
          <p className="mt-1 text-sm text-kmp-graphite/70">Portal do cliente</p>
        </div>
        <PortalLoginForm />
      </div>
    </main>
  );
}
