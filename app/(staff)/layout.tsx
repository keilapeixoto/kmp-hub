import { getNotificacoes } from "@/lib/notificacoes";
import { createClient } from "@/lib/supabase/server";
import { HeaderBar } from "./_components/header-bar";
import { PageWash } from "@/components/page-wash";

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
    <div className="relative isolate min-h-screen bg-kmp-bg">
      <PageWash />
      <HeaderBar userEmail={user.email ?? ""} notificacoes={await getNotificacoes(user.id)} />
      <main className="mx-auto w-full max-w-[1600px] px-6 py-6 lg:px-10">{children}</main>
    </div>
  );
}
