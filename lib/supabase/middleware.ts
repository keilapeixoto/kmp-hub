import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const STAFF_PUBLIC_PATHS = ["/login"];
const PORTAL_PUBLIC_PATHS = ["/portal/login"];

/**
 * Atualiza a sessão do Supabase a cada requisição e protege as rotas de
 * (staff) e (portal): sem sessão válida, redireciona para o login do grupo
 * correspondente. Toda regra fina de acesso a dados continua vivendo em RLS —
 * isto aqui só decide para onde a navegação vai.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPortalRoute = pathname.startsWith("/portal");
  const isPublicPath = isPortalRoute
    ? PORTAL_PUBLIC_PATHS.includes(pathname)
    : STAFF_PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = isPortalRoute ? "/portal/login" : "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/portal/login")) {
    const url = request.nextUrl.clone();
    url.pathname = isPortalRoute ? "/portal" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
