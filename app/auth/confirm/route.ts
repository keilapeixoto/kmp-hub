import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro, tipoDoLink } from "@/lib/auth/link";

/**
 * Entrada do link de acesso por e-mail (portal e convites). Usa o token do
 * próprio link (token_hash) e por isso funciona em qualquer aparelho — o
 * fluxo antigo (/auth/callback, PKCE) só funcionava no mesmo navegador em que
 * o link foi pedido. Se vier um "code" (modelo de e-mail antigo), também aceita.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = destinoSeguro(searchParams.get("next"));
  const loginDeVolta = next.startsWith("/portal") ? "/portal/login" : "/login";
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const tipo = tipoDoLink(searchParams.get("type"));
  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("[auth/confirm] verifyOtp falhou:", error.status, error.code, error.message);
  } else {
    const code = searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
      console.error("[auth/confirm] code falhou:", error.status, error.code, error.message);
    }
  }

  return NextResponse.redirect(`${origin}${loginDeVolta}?link=expirado`);
}
