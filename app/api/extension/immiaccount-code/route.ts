import { NextResponse } from "next/server";
import { resolveExtensionToken } from "@/lib/extension/tokens";
import { getValidAccessToken } from "@/lib/google/connections";
import { getLatestImmiAccountCode } from "@/lib/google/gmail";

// Chamada pela extensão de navegador (origem chrome-extension://...), não
// por um fluxo logado no Hub — autentica pelo token da extensão, não por
// cookie de sessão. CORS liberado pra qualquer origem porque o token já
// é a autenticação (sem ele, a chamada não vai a lugar nenhum).
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

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "conta Google não conectada — conecte em /configuracoes/integracoes" },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  try {
    const result = await getLatestImmiAccountCode(accessToken);
    if (!result) {
      return NextResponse.json(
        { error: "nenhum código recente encontrado" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "falha ao consultar o Gmail" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
