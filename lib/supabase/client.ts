import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components. Usa a publishable key —
 * respeita RLS. Nunca ler SUPABASE_SECRET_KEY aqui.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
