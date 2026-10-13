/**
 * Ícones de marca (Google, Gmail) pra tela de Integrações e pro card de
 * resumo do dia — só onde a conexão Google aparece de verdade, não troca
 * os ícones genéricos (lucide) usados no resto do Hub.
 */

export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export function GmailLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path fill="#4285f4" d="M34.9 448h81.5V250.2L0 163v250.2C0 432.5 15.7 448 34.9 448" />
      <path fill="#34a853" d="M395.6 448h81.5c19.3 0 34.9-15.7 34.9-34.9V163l-116.4 87.3" />
      <path fill="#fbbc04" d="M395.6 99v151.3L512 163v-46.5c0-43.2-49.3-67.8-83.8-41.9" />
      <path fill="#ea4335" d="M116.4 250.2V99L256 203.7 395.6 99v151.3L256 355" />
      <path fill="#c5221f" d="M0 116.4V163l116.4 87.3V99L83.8 74.5C49.2 48.6 0 73.2 0 116.4" />
    </svg>
  );
}
