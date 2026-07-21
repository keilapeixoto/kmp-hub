import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HeaderBar } from "./_components/header-bar";
import { Sidebar } from "./_components/sidebar";

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
    <div className="flex min-h-screen bg-kmp-bg">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar userEmail={user.email ?? ""} />
        <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
