import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GUIDES_BUCKET } from "@/lib/guides/data";

/**
 * Redireciona para uma URL assinada de curta duração do PDF anexado ao guia.
 * Usa o cliente da sessão, então RLS decide se o usuário pode ver este guia
 * — sem sessão, sem permissão, ou sem PDF anexado, 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: guide } = await supabase
    .from("guides")
    .select("pdf_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!guide?.pdf_storage_path) {
    return NextResponse.json({ error: "PDF não encontrado" }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from(GUIDES_BUCKET)
    .createSignedUrl(guide.pdf_storage_path, 300);

  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: "Não foi possível gerar o link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
