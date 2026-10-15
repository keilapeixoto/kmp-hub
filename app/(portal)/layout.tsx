import { PageWash } from "@/components/page-wash";

// Portal do cliente no mesmo visual do Hub (redesign âmbar, out/2026): fundo
// cinza com âmbar no canto e cartões brancos translúcidos.
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-screen bg-kmp-bg">
      <PageWash />
      {children}
    </div>
  );
}
