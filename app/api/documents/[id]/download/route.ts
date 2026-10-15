import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";

/**
 * Redireciona para uma URL assinada de curta duração do documento.
 * Usa o cliente da sessão (publishable key + cookies), então o RLS decide se
 * o usuário pode ver este documento — sem sessão ou sem permissão, 404.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, nome")
    .eq("id", id)
    .maybeSingle();

  const comoJson = new URL(request.url).searchParams.get("json");
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado ou sem permissão." }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    // ?baixar=1 força o download com o nome do documento; sem isso o
    // navegador abre na própria aba (pré-visualização).
    .createSignedUrl(
      doc.storage_path,
      300,
      new URL(request.url).searchParams.get("baixar") ? { download: doc.nome ?? true } : undefined,
    );

  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: "Não foi possível gerar o link" },
      { status: 500 },
    );
  }

  // ?json=1: a pré-visualização do Hub pede o link e mostra "Carregando…"/erro.
  if (comoJson) return NextResponse.json({ url: signed.signedUrl });
  return NextResponse.redirect(signed.signedUrl);
}
