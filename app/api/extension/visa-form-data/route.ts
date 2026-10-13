import { NextResponse } from "next/server";
import { resolveExtensionToken } from "@/lib/extension/tokens";
import { getVisaFormDataForCase } from "@/lib/extension/visa-form";

// Devolve os dados já preenchidos pelo cliente no formulário do visto
// (Subclass 600, por enquanto) pra extensão copiar nos campos do
// ImmiAccount. Mesmo padrão de autenticação por Bearer token dos outros
// endpoints da extensão.
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
  const caseId = searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json(
      { error: "caseId ausente" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const dados = await getVisaFormDataForCase(userId, caseId);
  if (!dados) {
    return NextResponse.json(
      { error: "processo não encontrado, sem acesso, ou sem formulário preenchido" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(dados, { headers: CORS_HEADERS });
}
