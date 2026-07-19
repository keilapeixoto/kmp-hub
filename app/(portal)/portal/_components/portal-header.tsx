import { portalLogout } from "../actions";

export function PortalHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-4">
      <span className="font-heading text-xl text-kmp-graphite">KMP Hub</span>
      <form action={portalLogout}>
        <button
          type="submit"
          className="text-sm text-kmp-graphite/60 hover:text-kmp-orange"
        >
          Sair
        </button>
      </form>
    </header>
  );
}
