import { NextResponse } from "next/server";
import { resolveExtensionToken } from "@/lib/extension/tokens";
import { searchVisaFormCases } from "@/lib/extension/visa-form";

// Chamada pela extensão (popup) pra buscar o processo do cliente antes de
// preencher o visto — mesmo padrão de autenticação por Bearer token de
// /api/extension/immiaccount-code (sem sessão/cookie, CORS liberado porque
// o token já é a autenticação).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "token ausente" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const userId = await resolveExtensionToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "token inválido ou revogado" },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const resultados = await searchVisaFormCases(userId, q);
  return NextResponse.json({ resultados }, { headers: CORS_HEADERS });
}
