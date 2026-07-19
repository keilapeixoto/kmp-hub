import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Troca o "code" do link de e-mail (magic link do portal, fluxo PKCE do
 * @supabase/ssr) por uma sessão de verdade, gravando os cookies antes de
 * redirecionar. Sem isso, o link cai de volta na tela de login sem sessão
 * nenhuma — não dá erro, só não loga.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/portal/login`);
}
