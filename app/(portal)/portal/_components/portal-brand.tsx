// Marca do portal: mesmo logo do Hub (símbolo KMP | HUB), com "PORTAL" em
// laranja no lugar de "CRM" — o cliente sabe que está no endereço dele.
export function PortalBrand({ grande = false }: { grande?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG local fixo, sem otimização */}
      <img src="/kmp-logo-mark.svg" alt="KMP" className={grande ? "h-12 w-auto" : "h-9 w-auto"} />
      <span aria-hidden="true" className={`${grande ? "h-10" : "h-8"} w-px bg-kmp-text/25`} />
      <span className="flex flex-col items-end font-wordmark leading-none">
        <span className={`${grande ? "text-[28px]" : "text-[22px]"} font-extrabold tracking-tight text-kmp-text`}>HUB</span>
        <span className="mt-0.5 mr-[-0.28em] text-[10.5px] font-semibold tracking-[0.28em] text-kmp-orange">PORTAL</span>
      </span>
    </span>
  );
}
