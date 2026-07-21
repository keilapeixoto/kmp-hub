import { NextResponse } from "next/server";
import { search } from "@/lib/search/data";

/**
 * Sugestões da busca global enquanto o usuário digita (ver header-bar). RLS
 * da sessão já filtra os resultados — mesma função usada em /busca.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await search(q);
  return NextResponse.json({ results: results.slice(0, 8) });
}
