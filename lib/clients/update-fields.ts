// Campos de um cliente para gravar numa edição. Sem dependências do app.
// consultor_id e idioma_preferencial são obrigatórios no banco: mandar nulo
// fazia a edição inteira falhar ("Não foi possível salvar as alterações").

export function camposParaAtualizar(
  campos: Record<string, string | null>,
  opcoes: { usuarioId: string; consultorNoFormulario: boolean },
): Record<string, string | null> {
  const r: Record<string, string | null> = { ...campos };
  if (!opcoes.consultorNoFormulario) {
    // campo travado para quem não pode trocar o consultor: não mexe
    delete r.consultor_id;
  } else if (!r.consultor_id) {
    // "Eu mesmo(a)" chega vazio
    r.consultor_id = opcoes.usuarioId;
  }
  if (!r.idioma_preferencial) delete r.idioma_preferencial;
  return r;
}
