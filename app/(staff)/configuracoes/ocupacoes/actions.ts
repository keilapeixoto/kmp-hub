"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOccupationsCsv } from "@/lib/occupations/csv";

export type ImportOccupationsState = {
  error: string | null;
  resultado: { criadas: number; atualizadas: number; ignoradas: number } | null;
};

export async function importOccupationsCsv(
  _prevState: ImportOccupationsState,
  formData: FormData,
): Promise<ImportOccupationsState> {
  const arquivo = formData.get("arquivo");
  const colado = formData.get("conteudo");

  let conteudo = "";
  if (arquivo instanceof File && arquivo.size > 0) {
    conteudo = await arquivo.text();
  } else if (typeof colado === "string") {
    conteudo = colado;
  }

  if (!conteudo.trim()) {
    return {
      error: "Cole o conteúdo do CSV ou selecione um arquivo.",
      resultado: null,
    };
  }

  const { rows, errors } = parseOccupationsCsv(conteudo);
  if (rows.length === 0) {
    return {
      error: errors[0] ?? "Nenhuma linha válida encontrada no CSV.",
      resultado: null,
    };
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("occupations")
    .select("codigo_anzsco")
    .in(
      "codigo_anzsco",
      rows.map((r) => r.codigo_anzsco),
    );
  const codigosExistentes = new Set(
    (existentes ?? []).map((r) => r.codigo_anzsco as string),
  );

  const { error } = await supabase
    .from("occupations")
    .upsert(rows, { onConflict: "codigo_anzsco" });

  if (error) {
    return {
      error: `Não foi possível importar: ${error.message}`,
      resultado: null,
    };
  }

  const criadas = rows.filter(
    (r) => !codigosExistentes.has(r.codigo_anzsco),
  ).length;
  const atualizadas = rows.length - criadas;

  revalidatePath("/ocupacoes");
  revalidatePath("/configuracoes/ocupacoes");

  return {
    error: null,
    resultado: { criadas, atualizadas, ignoradas: errors.length },
  };
}
