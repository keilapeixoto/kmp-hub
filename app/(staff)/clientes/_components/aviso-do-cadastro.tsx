// Aviso no perfil logo depois do "Cadastrar e convidar para o portal".

const FALTOU: Record<string, string> = {
  processo: "o processo não foi criado (crie na aba Processos)",
  checklist: "o checklist não foi criado (abra o processo e escolha o checklist)",
  convite: "o convite do portal não foi enviado (use \"Acesso ao portal\" ao lado)",
};

export function AvisoDoCadastro({ cadastro, faltou }: { cadastro: string; faltou: string[] }) {
  if (cadastro === "parcial") {
    const itens = faltou.map((f) => FALTOU[f]).filter(Boolean);
    return (
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Cliente cadastrado, mas {itens.length ? itens.join("; ") : "uma das etapas falhou"}.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
      {cadastro === "convidado"
        ? "Cliente cadastrado com processo e checklist. O convite do portal foi enviado por e-mail: no portal o cliente preenche o formulário e envia cada documento, e tudo aparece aqui."
        : "Cliente cadastrado com processo e checklist. O convite do portal não foi enviado: use \"Acesso ao portal\" quando quiser."}
    </div>
  );
}
