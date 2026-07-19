import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents/data";

/**
 * Redireciona para uma URL assinada de curta duração do documento.
 * Usa o cliente da sessão (publishable key + cookies), então o RLS decide se
 * o usuário pode ver este documento — sem sessão ou sem permissão, 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 300);

  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: "Não foi possível gerar o link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
