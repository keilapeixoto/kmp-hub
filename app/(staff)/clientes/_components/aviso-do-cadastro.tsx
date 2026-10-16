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

const ACESSO: Record<string, { ok: boolean; texto: string }> = {
  renomeado: { ok: true, texto: "O login do portal passou para o e-mail novo. O cliente entra com ele (link de acesso na tela de login do portal)." },
  movido: { ok: true, texto: "Já existia uma conta com o e-mail novo: o acesso ao portal passou para ela." },
  removido: { ok: true, texto: "O login que não era o e-mail do cadastro saiu do portal deste cliente (ou o e-mail foi apagado e o acesso foi removido)." },
  convidar: { ok: false, texto: "O login antigo saiu (era usado por outros clientes também). Use \"Convidar para o portal\" para o e-mail novo." },
  equipe: { ok: false, texto: "O e-mail novo é de alguém da equipe: o acesso ao portal não foi mudado. Confira o e-mail do cliente." },
  erro: { ok: false, texto: "O cadastro foi salvo, mas não consegui ajustar o acesso ao portal. Confira no card \"Acesso ao portal\"." },
};

/** Aviso depois de mudar o e-mail do cliente (o login do portal acompanha). */
export function AvisoDoAcesso({ acesso }: { acesso: string }) {
  const a = ACESSO[acesso];
  if (!a) return null;
  return (
    <div
      className={`rounded-3xl border p-4 text-sm ${a.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
    >
      {a.texto}
    </div>
  );
}
