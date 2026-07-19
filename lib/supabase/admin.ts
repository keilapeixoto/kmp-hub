import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a secret key — ignora RLS. Uso restrito a Server
 * Actions que precisam da API admin (ex.: convidar um cliente para o
 * portal). Nunca importar em componente client nem expor o resultado bruto.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
