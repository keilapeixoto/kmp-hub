"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// <details> que fecha ao clicar fora, com Esc e ao trocar de página (o
// <details> puro do navegador só fecha clicando de novo nele).
export function MenuSuspenso({
  className,
  summaryClassName,
  summary,
  ariaLabel,
  children,
}: {
  className?: string;
  summaryClassName?: string;
  summary: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape" && ref.current) ref.current.open = false;
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      <summary aria-label={ariaLabel} className={`${summaryClassName ?? ""} cursor-pointer list-none`}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
