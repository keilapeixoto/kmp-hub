// KMP Hub · Lê o e-mail "Nova Solicitação de Visto Turista" do formulário
// avulso antigo (HTML + Web3Forms, salvo em PDF pelo Gmail) e converte nos
// campos do "Formulário Visto de Turista (Subclass 600) — Coleta de Dados".
// Mesmo formato de saída de lib/record-of-responses/map-600.ts: chave =
// rótulo do campo no Hub. Sem imports com alias (testável em
// tests/unit/formulario-antigo.test.mjs).
//
// No e-mail cada resposta vem como "Pergunta: valor"; os rótulos são os do
// QUESTIONS do formulário antigo. Perguntas sim/não vêm como "SIM/YES — detalhe"
// ou "NÃO/NO"; opções como "Casado(a)/Married" (o Hub guarda só a parte em
// português).

export type Mapeamento = { campos: Record<string, string>; avisos: string[] };

/** Rótulos do formulário antigo, na ordem do e-mail (também servem de limite entre respostas). */
const ROTULOS = [
  "Nome completo (conforme passaporte)",
  "Outros nomes já utilizados (nome de solteiro(a), apelido legal etc)",
  "Você já mudou de nome (por exemplo, por casamento ou divórcio)?",
  "Gênero",
  "Data de nascimento",
  "Cidade de nascimento",
  "País de nascimento",
  "Estado civil",
  "Nacionalidade atual",
  "Você possui outra nacionalidade ou cidadania?",
  "Nível de escolaridade",
  "Número do passaporte",
  "País de emissão do passaporte",
  "Nacionalidade conforme consta no passaporte",
  "Data de emissão do passaporte",
  "Data de validade do passaporte",
  "Local de emissão do passaporte",
  "Você possui ou já possuiu outro passaporte?",
  "Documento nacional de identidade (RG e CPF)",
  "Endereço residencial completo",
  "País de residência",
  "Telefone residencial",
  "Telefone comercial",
  "Celular",
  "E-mail",
  "Endereço para correspondência (se diferente do residencial)",
  "Dados do cônjuge/parceiro(a), se houver",
  "Data de nascimento do cônjuge/parceiro(a)",
  "Nacionalidade do cônjuge/parceiro(a)",
  "Nº do passaporte do cônjuge/parceiro(a)",
  "Seu cônjuge/parceiro(a) irá acompanhá-lo(a) na viagem?",
  "Você tem filhos?",
  "Nome da mãe",
  "Nome do pai",
  "Você tem algum familiar ou amigo na Austrália?",
  "Motivo da viagem à Austrália",
  "Data prevista de chegada na Austrália",
  "Tempo de permanência pretendido",
  "Endereço na Austrália onde pretende ficar",
  "Cidades ou regiões que pretende visitar",
  "Alguém está te acompanhando nesta viagem?",
  "Situação profissional atual",
  "Nome da empresa / instituição",
  "Cargo / função",
  "Endereço da empresa",
  "Telefone da empresa",
  "Nome do supervisor direto",
  "Contato do supervisor direto",
  "Quem custeará sua viagem?",
  "Renda mensal aproximada (R$)",
  "Valor estimado em fundos disponíveis para a viagem",
  "Você já visitou a Austrália antes?",
  "Você já solicitou visto para a Austrália antes?",
  "Você já solicitou visto de residência permanente na Austrália nos últimos 5 anos?",
  "Quais países você já visitou nos últimos 10 anos?",
  "Você (ou qualquer pessoa incluída nesta aplicação) possui ou já possuiu visto para a Austrália ou qualquer outro país?",
  "Você (ou qualquer pessoa incluída nesta aplicação) tem alguma condição de saúde que possa requerer tratamento médico durante a estadia na Austrália?",
  "Você pretende trabalhar ou prestar serviços profissionais na Austrália durante sua estadia?",
  "Você (ou qualquer pessoa incluída nesta aplicação) já foi condenado(a) por algum crime em qualquer país?",
  "Você (ou qualquer pessoa incluída nesta aplicação) já foi acusado(a) de algum crime pendente?",
  "Você ou qualquer pessoa incluída nesta aplicação, já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
  "Você ou qualquer pessoa incluída nesta aplicação, já teve um pedido de visto recusado ou cancelado em qualquer país?",
  "Assinatura digital",
  "Data da assinatura",
];

/** Documentos que o cliente anexou (o e-mail só traz o nome dos arquivos). */
const ANEXOS: Record<string, string> = {
  "Cópia do passaporte (página de dados)": "passaporte",
  "Comprovante de renda ou holerite (solicitante ou sponsor)": "comprovante de renda",
  "Extrato bancário dos últimos 3 meses (solicitante ou sponsor)": "extrato bancário",
  "Comprovante de vínculo (trabalho/estudo)": "comprovante de vínculo",
  "Comprovante de endereço": "comprovante de endereço",
  "Passaporte e visto de quem está convidando (host)": "passaporte/visto de quem convida",
  "Itinerário de viagem": "itinerário",
  "Outros documentos anexados": "outros documentos",
  "Certidão de casamento": "certidão de casamento",
  "Certidão de divórcio": "certidão de divórcio",
  "Comprovação de abertura da empresa": "comprovação da empresa",
};

/** Fim das respostas no e-mail. */
const FIM = ["ATENÇÃO:", "Visitor IP:"];

const OPCOES: Record<string, string[]> = {
  Gênero: ["Masculino", "Feminino", "Outro"],
  "Estado civil": ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Separado(a)", "União Estável", "Noivo(a)"],
  "Nível de escolaridade": ["Ensino Fundamental", "Ensino Médio", "Ensino Superior", "Pós-Graduação", "Outro"],
  "Motivo da viagem à Austrália": [
    "Turismo",
    "Visitar família/amigos",
    "Negócios",
    "Estudo de curta duração (até 12 semanas)",
    "Tratamento médico",
    "Outro",
  ],
  "Tempo de permanência pretendido": ["Até 2 semanas", "2 a 4 semanas", "1 a 3 meses", "3 a 6 meses", "6 a 12 meses"],
  "Situação profissional atual": [
    "Empregado(a)",
    "Autônomo(a)",
    "Empresário(a)",
    "Aposentado(a)",
    "Estudante",
    "Do lar",
    "Desempregado(a)",
  ],
  "Quem custeará sua viagem?": [
    "Eu mesmo(a)",
    "Cônjuge/parceiro(a)",
    "Pais",
    "Empresa",
    "Patrocinador na Austrália",
    "Outro",
  ],
  "Renda mensal aproximada (BRL)": [
    "Até R$ 3.000",
    "R$ 3.001 a R$ 6.000",
    "R$ 6.001 a R$ 10.000",
    "R$ 10.001 a R$ 20.000",
    "Acima de R$ 20.000",
  ],
};

/** Tira cabeçalho/rodapé que o Gmail repete em cada página impressa. */
function semCabecalhos(texto: string): string {
  return texto
    .split(/\r?\n/)
    .filter(
      (l) =>
        !/mail\.google\.com/i.test(l) &&
        !/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/.test(l) &&
        !/^\s*\d+\/\d+\s*$/.test(l),
    )
    .join("\n")
    .replace(/\s+/g, " ");
}

/** Respostas do e-mail: rótulo antigo -> valor (só os que aparecem). */
export function lerEmailDoFormulario(texto: string): Record<string, string> {
  const corrido = semCabecalhos(texto);
  const achados: { rotulo: string; inicio: number; fim: number }[] = [];
  let desde = 0;
  for (const rotulo of [...ROTULOS, ...Object.keys(ANEXOS)]) {
    const i = corrido.indexOf(`${rotulo}:`, desde);
    if (i < 0) continue;
    achados.push({ rotulo, inicio: i, fim: i + rotulo.length + 1 });
    desde = i + rotulo.length + 1;
  }
  const limites = FIM.map((f) => corrido.indexOf(f, desde)).filter((i) => i >= 0);
  const final = limites.length ? Math.min(...limites) : corrido.length;

  const respostas: Record<string, string> = {};
  achados.forEach((a, n) => {
    const ate = n + 1 < achados.length ? achados[n + 1].inicio : final;
    const valor = corrido.slice(a.fim, ate).trim();
    if (valor) respostas[a.rotulo] = valor;
  });
  return respostas;
}

/** "SIM/YES — detalhe" -> { resposta: "Sim", detalhe }. */
function simNao(valor: string | undefined): { resposta: string | null; detalhe: string | null } {
  if (!valor) return { resposta: null, detalhe: null };
  const [antes, ...resto] = valor.split(" — ");
  const detalhe = resto.join(" — ").trim() || null;
  if (/^SIM\b/i.test(antes)) return { resposta: "Sim", detalhe };
  if (/^N[ÃA]O\b/i.test(antes)) return { resposta: "Não", detalhe };
  return { resposta: null, detalhe: valor };
}

/** "Casado(a)/Married" -> "Casado(a)", só se for uma opção do Hub. */
function opcao(rotuloHub: string, valor: string | undefined): string | null {
  if (!valor) return null;
  const v = valor.trim();
  return OPCOES[rotuloHub]?.find((o) => v === o || v.startsWith(`${o}/`) || v.startsWith(`${o} /`)) ?? null;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function mapEmailTo600(texto: string): Mapeamento {
  const r = lerEmailDoFormulario(texto);
  const campos: Record<string, string> = {};
  const avisos: string[] = [];
  const poe = (rotulo: string, valor: string | null | undefined) => {
    const v = valor?.trim();
    if (v) campos[rotulo] = v;
  };
  const data = (rotulo: string, valor: string | undefined) => {
    if (valor && DATA.test(valor.trim())) poe(rotulo, valor);
  };
  const simNaoCom = (rotuloHub: string, antigo: string, rotuloDetalhe?: string) => {
    const { resposta, detalhe } = simNao(r[antigo]);
    poe(rotuloHub, resposta);
    if (rotuloDetalhe) poe(rotuloDetalhe, detalhe);
  };

  if (Object.keys(r).length === 0) return { campos, avisos: ["Não achei nenhuma resposta do formulário neste PDF."] };

  // Nome: o e-mail junta nome e sobrenome; divide no primeiro espaço.
  const nome = r["Nome completo (conforme passaporte)"]?.split(/\s+/) ?? [];
  if (nome.length) {
    poe("Nome", nome[0]);
    poe("Sobrenome", nome.slice(1).join(" "));
    if (nome.length > 2) avisos.push("Nome e sobrenome foram separados no primeiro espaço: confira com o passaporte.");
  }
  const outros = r["Outros nomes já utilizados (nome de solteiro(a), apelido legal etc)"];
  poe("Outros nomes já utilizados", outros);
  if (outros) poe("Já usou ou usa outros nomes (nome de solteira, apelido legal)?", "Sim");
  if (simNao(r["Você já mudou de nome (por exemplo, por casamento ou divórcio)?"]).resposta === "Sim") {
    avisos.push("O cliente disse que já mudou de nome: as certidões de casamento e divórcio são necessárias.");
  }

  poe("Gênero", opcao("Gênero", r["Gênero"]));
  data("Data de nascimento", r["Data de nascimento"]);
  poe("Cidade de nascimento", r["Cidade de nascimento"]);
  poe("País de nascimento", r["País de nascimento"]);
  poe("Estado civil", opcao("Estado civil", r["Estado civil"]));
  poe("Nacionalidade atual", r["Nacionalidade atual"]);
  simNaoCom("Possui, ou já possuiu, outra nacionalidade ou cidadania?", "Você possui outra nacionalidade ou cidadania?", "Qual nacionalidade");
  poe("Nível de escolaridade", opcao("Nível de escolaridade", r["Nível de escolaridade"]));

  poe("Número do passaporte", r["Número do passaporte"]);
  poe("País de emissão", r["País de emissão do passaporte"]);
  poe("Nacionalidade conforme passaporte", r["Nacionalidade conforme consta no passaporte"]);
  data("Data de emissão", r["Data de emissão do passaporte"]);
  data("Data de validade", r["Data de validade do passaporte"]);
  poe("Local de emissão", r["Local de emissão do passaporte"]);
  simNaoCom("Possui, ou já possuiu, outro passaporte?", "Você possui ou já possuiu outro passaporte?", "Detalhes (país, número, validade)");
  const identidade = r["Documento nacional de identidade (RG e CPF)"];
  if (identidade) {
    const partes = identidade.split(" · ").map((p) => p.trim());
    const cpf = partes.find((p) => /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(p)) ?? (partes.length === 2 ? partes[1] : null);
    const rg = partes.find((p) => p !== cpf) ?? null;
    poe("RG / Documento de identidade", rg);
    poe("CPF", cpf);
    if (rg) poe("Possui carteira de identidade nacional (RG)?", "Sim");
  }

  const endereco = r["Endereço residencial completo"];
  poe("Endereço residencial completo", endereco);
  const cep = endereco?.match(/\b\d{5}-?\d{3}\b/)?.[0];
  poe("CEP", cep);
  poe("País", r["País de residência"]);
  poe("Telefone residencial", r["Telefone residencial"]);
  poe("Telefone comercial", r["Telefone comercial"]);
  poe("Celular", r["Celular"]);
  poe("E-mail", r["E-mail"]);
  poe("Endereço para correspondência", r["Endereço para correspondência (se diferente do residencial)"]);

  poe("Nome completo do cônjuge/parceiro(a)", r["Dados do cônjuge/parceiro(a), se houver"]);
  data("Data de nascimento do cônjuge", r["Data de nascimento do cônjuge/parceiro(a)"]);
  poe("Nacionalidade do cônjuge", r["Nacionalidade do cônjuge/parceiro(a)"]);
  poe("Número do passaporte do cônjuge", r["Nº do passaporte do cônjuge/parceiro(a)"]);
  simNaoCom("O cônjuge/parceiro(a) irá acompanhá-lo(a) na viagem?", "Seu cônjuge/parceiro(a) irá acompanhá-lo(a) na viagem?");
  simNaoCom("Você tem filhos?", "Você tem filhos?", "Nome, data de nascimento e se viaja junto (cada filho)");
  poe("Nome da mãe", r["Nome da mãe"]);
  poe("Nome do pai", r["Nome do pai"]);
  simNaoCom(
    "Tem algum familiar ou amigo na Austrália?",
    "Você tem algum familiar ou amigo na Austrália?",
    "Nome, relação e endereço na Austrália",
  );

  poe("Motivo da viagem à Austrália", opcao("Motivo da viagem à Austrália", r["Motivo da viagem à Austrália"]));
  data("Data prevista de chegada na Austrália", r["Data prevista de chegada na Austrália"]);
  poe("Tempo de permanência pretendido", opcao("Tempo de permanência pretendido", r["Tempo de permanência pretendido"]));
  poe("Endereço na Austrália onde pretende ficar", r["Endereço na Austrália onde pretende ficar"]);
  poe("Cidades ou regiões que pretende visitar", r["Cidades ou regiões que pretende visitar"]);
  simNaoCom("Alguém está te acompanhando nesta viagem?", "Alguém está te acompanhando nesta viagem?", "Nome(s) e relação do(s) acompanhante(s)");

  poe("Situação profissional atual", opcao("Situação profissional atual", r["Situação profissional atual"]));
  poe("Nome da empresa/instituição", r["Nome da empresa / instituição"]);
  poe("Cargo/função", r["Cargo / função"]);
  poe("Endereço da empresa", r["Endereço da empresa"]);
  poe("Telefone da empresa", r["Telefone da empresa"]);
  if (r["Nome do supervisor direto"] || r["Contato do supervisor direto"]) {
    avisos.push("O e-mail traz nome/contato do supervisor, que o formulário do Hub não tem: veja no PDF.");
  }
  poe("Quem custeará sua viagem?", opcao("Quem custeará sua viagem?", r["Quem custeará sua viagem?"]));
  poe("Renda mensal aproximada (BRL)", opcao("Renda mensal aproximada (BRL)", r["Renda mensal aproximada (R$)"]));
  poe("Valor estimado em fundos disponíveis para a viagem", r["Valor estimado em fundos disponíveis para a viagem"]);

  simNaoCom("Já visitou a Austrália antes?", "Você já visitou a Austrália antes?", "Datas, duração e tipo de visto");
  simNaoCom("Já solicitou visto para a Austrália antes?", "Você já solicitou visto para a Austrália antes?", "Tipo de visto, data e resultado");
  simNaoCom(
    "Já solicitou residência permanente na Austrália nos últimos 5 anos?",
    "Você já solicitou visto de residência permanente na Austrália nos últimos 5 anos?",
    "Detalhes da solicitação de residência permanente",
  );
  poe("Países visitados nos últimos 10 anos", r["Quais países você já visitou nos últimos 10 anos?"]);
  poe(
    "Vistos anteriores para Austrália ou outro país",
    r["Você (ou qualquer pessoa incluída nesta aplicação) possui ou já possuiu visto para a Austrália ou qualquer outro país?"],
  );

  // Declarações: são as respostas do próprio cliente para esta aplicação.
  simNaoCom(
    "Possui alguma condição de saúde que possa requerer tratamento durante a estadia na Austrália?",
    "Você (ou qualquer pessoa incluída nesta aplicação) tem alguma condição de saúde que possa requerer tratamento médico durante a estadia na Austrália?",
    "Descreva a condição de saúde",
  );
  simNaoCom(
    "Pretende trabalhar ou prestar serviços profissionais na Austrália durante a estadia?",
    "Você pretende trabalhar ou prestar serviços profissionais na Austrália durante sua estadia?",
  );
  simNaoCom(
    "Já foi condenado por crime em qualquer país?",
    "Você (ou qualquer pessoa incluída nesta aplicação) já foi condenado(a) por algum crime em qualquer país?",
    "Descreva: crime, país, data, pena",
  );
  simNaoCom(
    "Possui acusação criminal pendente?",
    "Você (ou qualquer pessoa incluída nesta aplicação) já foi acusado(a) de algum crime pendente?",
    "Descreva a acusação",
  );
  simNaoCom(
    "Já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
    "Você ou qualquer pessoa incluída nesta aplicação, já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?",
    "Descreva o descumprimento/overstay",
  );
  simNaoCom(
    "Já teve pedido de visto recusado ou cancelado em qualquer país?",
    "Você ou qualquer pessoa incluída nesta aplicação, já teve um pedido de visto recusado ou cancelado em qualquer país?",
    "Descreva a recusa/cancelamento",
  );

  poe("Assinatura digital (nome completo)", r["Assinatura digital"]);
  data("Data", r["Data da assinatura"]);

  const anexados = Object.entries(ANEXOS)
    .filter(([rotulo]) => r[rotulo])
    .map(([, nomeCurto]) => nomeCurto);
  if (anexados.length) {
    avisos.push(
      `No formulário antigo o cliente anexou: ${anexados.join(", ")}. Esses arquivos não vêm no e-mail; suba pelo processo ou peça pelo portal.`,
    );
  }
  return { campos, avisos };
}

/** O PDF é o e-mail do formulário antigo? */
export function ehEmailDoFormularioAntigo(texto: string): boolean {
  const t = texto.replace(/\s+/g, " ");
  return t.includes("Nome completo (conforme passaporte):") && t.includes("Número do passaporte:");
}
