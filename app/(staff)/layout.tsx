import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-kmp-bg">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-4">
        <span className="font-heading text-xl text-kmp-graphite">
          KMP Hub
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-kmp-graphite/70">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-kmp-graphite/70 transition hover:text-kmp-orange"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
