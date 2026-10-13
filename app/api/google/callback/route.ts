import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
  GOOGLE_SCOPES,
} from "@/lib/google/oauth";
import { saveGoogleConnection } from "@/lib/google/connections";

const SETTINGS_PATH = "/configuracoes/integracoes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.match(/google_oauth_state=([^;]+)/)?.[1];

  const fail = (motivo: string) =>
    NextResponse.redirect(new URL(`${SETTINGS_PATH}?erro=${motivo}`, request.url));

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("state_invalido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const redirectUri = new URL("/api/google/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      // Acontece se a conta já tinha autorizado antes sem "prompt=consent"
      // ter efeito — pedimos consent sempre, então isso não deveria ocorrer.
      return fail("sem_refresh_token");
    }

    const googleEmail = await fetchGoogleUserEmail(tokens.access_token);

    await saveGoogleConnection({
      userId: user.id,
      refreshToken: tokens.refresh_token,
      googleEmail,
      scope: tokens.scope || GOOGLE_SCOPES,
    });

    const response = NextResponse.redirect(
      new URL(`${SETTINGS_PATH}?conectado=1`, request.url),
    );
    response.cookies.delete("google_oauth_state");
    return response;
  } catch {
    return fail("falha_na_troca_de_token");
  }
}
