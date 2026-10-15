"use client";

import { useFormStatus } from "react-dom";

// Botão do formulário que mostra "Salvando…" enquanto a etapa grava — sem
// isso, o cliente clicava de novo achando que não tinha funcionado.
export function SubmitButton({
  formAction,
  formNoValidate,
  className,
  children,
}: {
  formAction: (formData: FormData) => void | Promise<void>;
  formNoValidate?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      formNoValidate={formNoValidate}
      disabled={pending}
      className={`${className} disabled:opacity-60`}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
