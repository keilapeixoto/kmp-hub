import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Padrão visual "vivo" do CRM (out/2026, pedido da Keila): faixa colorida nos
// títulos, blocos de número coloridos e etiquetas coloridas nas listas. As
// classes ficam escritas por extenso para o Tailwind encontrá-las.

export type CorViva =
  | "azul"
  | "turquesa"
  | "lilas"
  | "verde"
  | "amarelo"
  | "rosa"
  | "roxo"
  | "laranja"
  | "vermelho"
  | "cinza";

/** Degradê forte (fundo de bloco ou de faixa, texto branco por cima). */
export const DEGRADE: Record<CorViva, string> = {
  azul: "from-[#5f92f2] to-kmp-config-deep",
  turquesa: "from-[#45b4c5] to-kmp-leads-deep",
  lilas: "from-[#9184f2] to-kmp-clientes-deep",
  verde: "from-[#45c285] to-kmp-processos-deep",
  amarelo: "from-[#f0c040] to-kmp-agenda-deep",
  rosa: "from-[#e8679a] to-kmp-finance-deep",
  roxo: "from-[#bd72ae] to-kmp-documentos-deep",
  laranja: "from-kmp-orange to-kmp-orange-deep",
  vermelho: "from-[#ef6b7d] to-kmp-alert-deep",
  cinza: "from-[#a3a6ad] to-[#5f6268]",
};

/** Tom claro com texto escuro da mesma cor (etiquetas e linhas de lista). */
export const SUAVE: Record<CorViva, string> = {
  azul: "bg-[#e3ecfd] text-[#1f4fa8] dark:bg-[#5f92f2]/20 dark:text-[#b9cffa]",
  turquesa: "bg-[#dcf1f4] text-[#14606c] dark:bg-[#45b4c5]/20 dark:text-[#a6e0e8]",
  lilas: "bg-[#ebe8fd] text-[#4334b0] dark:bg-[#9184f2]/20 dark:text-[#cdc6fa]",
  verde: "bg-[#dcf3e7] text-[#16673f] dark:bg-[#45c285]/20 dark:text-[#a9e6c7]",
  amarelo: "bg-[#fcf1cf] text-[#7a5806] dark:bg-[#f0c040]/20 dark:text-[#f6dc8f]",
  rosa: "bg-[#fbe2ec] text-[#8c2350] dark:bg-[#e8679a]/20 dark:text-[#f5b9d0]",
  roxo: "bg-[#f3e2ef] text-[#6f2c63] dark:bg-[#bd72ae]/20 dark:text-[#e2bdd9]",
  laranja: "bg-[#fde6d4] text-[#8f3f07] dark:bg-[#f27b20]/20 dark:text-[#f9c39b]",
  vermelho: "bg-[#fde2e5] text-[#9a2433] dark:bg-[#ef6b7d]/20 dark:text-[#f6b6bf]",
  cinza: "bg-[#e9eaec] text-[#3f4247] dark:bg-white/10 dark:text-white/80",
};

/** Título de seção numa faixa colorida (fica no topo do cartão). */
export function FaixaTitulo({
  titulo,
  cor,
  icon: Icon,
  direita,
}: {
  titulo: string;
  cor: CorViva;
  icon?: LucideIcon;
  direita?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br ${DEGRADE[cor]} px-4 py-2.5 text-white shadow-sm`}
    >
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {titulo}
      </h2>
      {direita ? <div className="text-sm font-medium text-white/90">{direita}</div> : null}
    </div>
  );
}

/** Bloco colorido com um número grande (resumo do dia, contadores). */
export function BlocoNumero({
  label,
  valor,
  href,
  icon: Icon,
  cor,
}: {
  label: string;
  valor: string | number;
  href: string;
  icon: LucideIcon;
  cor: CorViva;
}) {
  return (
    <Link
      href={href}
      className={`relative flex h-28 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${DEGRADE[cor]} p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </span>
      <span className="font-heading text-4xl font-bold leading-none">{valor}</span>
      <Icon aria-hidden="true" className="absolute -bottom-3 -right-3 h-20 w-20 opacity-15" />
    </Link>
  );
}

/** Etiqueta colorida (status, tipo, prioridade) para listas e cards. */
export function Etiqueta({ cor, children }: { cor: CorViva; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SUAVE[cor]}`}>
      {children}
    </span>
  );
}
