import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ehIdioma, type Idioma } from "./i18n";

export const COOKIE_IDIOMA = "portal_idioma";

/**
 * Idioma do portal: a escolha do cliente no botão PT/EN (cookie); sem ela, o
 * idioma do cadastro do cliente (clients.idioma_preferencial, lido com a
 * sessão dele); sem nada, português.
 */
export async function getIdiomaDoPortal(): Promise<Idioma> {
  const jar = await cookies();
  const escolhido = jar.get(COOKIE_IDIOMA)?.value;
  if (ehIdioma(escolhido)) return escolhido;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "pt";
  const { data } = await supabase
    .from("client_access")
    .select("clients(idioma_preferencial)")
    .eq("client_user_id", user.id)
    .limit(1)
    .maybeSingle();
  const idioma = (data as unknown as { clients?: { idioma_preferencial: string } | null } | null)?.clients
    ?.idioma_preferencial;
  return ehIdioma(idioma) ? idioma : "pt";
}
