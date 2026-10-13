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
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4CAF50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
      <path fill="#1E88E5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
      <path fill="#E53935" d="M35,11.2l-11,8.25l-11-8.25L12,17.8v22.2h0h23h0V17.8L35,11.2z" />
      <polygon fill="#C62828" points="3,12.298 3,16.2 13,23.7 13,17.8" />
      <path fill="#FBC02D" d="M45,12.298V16.2l-10,7.5v-5.9L45,12.298z" />
      <path fill="#C62828" d="M3,12.298V16.2l10,7.5v-5.9L3,12.298z" />
      <path
        fill="#FBC02D"
        d="M45,12.298l-3.614,1.711L35,17.8l-11-8.25L13,17.8l-6.386-3.792L3,12.298l11-7.4h22L45,12.298z"
      />
    </svg>
  );
}
