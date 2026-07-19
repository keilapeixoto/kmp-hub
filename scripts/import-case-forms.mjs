// KMP Hub · Importa os 4 formulários de coleta de dados do kmp-forms.vercel.app
// como case_form_templates/steps/fields. Uploads de documento e pagamento NÃO
// entram aqui — documentos já têm o sistema de checklist/upload próprio, e
// pagamento é Fase 3 (Stripe). Idempotente: apaga o template existente com o
// mesmo nome antes de recriar, então pode rodar de novo com segurança.
//
// Uso: node scripts/import-case-forms.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const SN = ["Sim", "Não"];
const t = (label, ajuda) => ({ label, tipo: "text", ajuda, obrigatorio: true });
const tOpt = (label, ajuda) => ({ label, tipo: "text", ajuda, obrigatorio: false });
const ta = (label, ajuda) => ({ label, tipo: "textarea", ajuda, obrigatorio: true });
const taOpt = (label, ajuda) => ({ label, tipo: "textarea", ajuda, obrigatorio: false });
const dt = (label, ajuda) => ({ label, tipo: "date", ajuda, obrigatorio: true });
const dtOpt = (label, ajuda) => ({ label, tipo: "date", ajuda, obrigatorio: false });
const sel = (label, opcoes, ajuda) => ({ label, tipo: "select", opcoes, ajuda, obrigatorio: true });
const selOpt = (label, opcoes, ajuda) => ({ label, tipo: "select", opcoes, ajuda, obrigatorio: false });
const rad = (label, opcoes = SN, ajuda) => ({ label, tipo: "radio", opcoes, ajuda, obrigatorio: true });
const radOpt = (label, opcoes = SN, ajuda) => ({ label, tipo: "radio", opcoes, ajuda, obrigatorio: false });

const auStates = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const estadoCivil = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Separado(a)", "União Estável", "Noivo(a)"];

// ---------------------------------------------------------------------------
// Template 1 · Formulário 485 — Coleta de Dados
// ---------------------------------------------------------------------------

const FORM_485 = {
  nome: "Formulário 485 — Coleta de Dados",
  serviceTypeNames: [
    "Subclass 485 — Single",
    "Subclass 485 — Couple",
    "Subclass 485 Post-Higher Education — Single",
    "Subclass 485 Post-Higher Education — Couple",
  ],
  steps: [
    {
      titulo: "Contexto da Aplicação",
      fields: [
        sel("Stream do visto", ["485 - Post-Higher Education Work Stream", "485 - Post-Vocational Education Work Stream", "485 - Graduate Research Stream"]),
        sel("Qualificação educacional (AQF)", ["AQF Certificate III", "AQF Certificate IV", "AQF Diploma", "AQF Associate Degree", "AQF Bachelor Degree", "AQF Bachelor Honours", "AQF Graduate Certificate", "AQF Graduate Diploma", "AQF Masters Degree", "AQF Doctoral Degree"]),
        rad("Localização atual", ["Austrália", "Fora da Austrália"]),
        sel("Tipo de número de referência (visto atual/anterior)", ["TRN", "VIN", "Bridging visa evidence (BVE)", "ImmiCard", "Nenhum"]),
        tOpt("Número de referência"),
        t("Nome da ocupação ANZSCO"),
      ],
    },
    {
      titulo: "Dados Pessoais",
      fields: [
        t("Sobrenome", "Exatamente como no passaporte"),
        t("Nome(s)", "Exatamente como no passaporte"),
        rad("Gênero", ["Masculino", "Feminino", "Outro"]),
        dt("Data de nascimento"),
        t("Cidade de nascimento"),
        tOpt("Estado de nascimento"),
        t("País de nascimento"),
        sel("Estado civil", estadoCivil),
        rad("Já foi conhecido por outro nome?"),
        taOpt("Quais outros nomes", "Preencha se respondeu Sim acima"),
        rad("É cidadão do país do seu passaporte?"),
        rad("É cidadão de algum outro país?"),
        taOpt("Quais países", "Preencha se respondeu Sim acima"),
      ],
    },
    {
      titulo: "Passaporte & Documentos",
      fields: [
        t("Sobrenome no passaporte"),
        t("Nome(s) no passaporte"),
        sel("Gênero no passaporte", ["Masculino", "Feminino", "Outro"]),
        dt("Data de nascimento (passaporte)"),
        t("Número do passaporte"),
        t("País do passaporte"),
        t("Nacionalidade (passaporte)"),
        t("Local de emissão"),
        dt("Data de emissão"),
        dt("Data de validade"),
        rad("Tem número de concessão de visto australiano de aplicação anterior?"),
        tOpt("Número de concessão", "Preencha se respondeu Sim acima"),
        rad("Possui carteira de identidade nacional?"),
        rad("Possui outros passaportes ou documentos de viagem?"),
        taOpt("Detalhe outros passaportes", "Tipo, nome, número, país, datas"),
        rad("Realizou exame de saúde para visto australiano nos últimos 12 meses?"),
        rad("Há membros da família acompanhantes incluídos nesta aplicação?"),
        rad("Há membros da família não acompanhantes?"),
      ],
    },
    {
      titulo: "Contato & Endereço",
      fields: [
        t("País de residência usual"),
        t("Endereço residencial", "Endereço de rua obrigatório — caixa postal não é aceita"),
        t("Suburb / Town"),
        sel("Estado", auStates),
        t("Postcode"),
        t("Celular"),
        tOpt("Telefone residencial"),
        tOpt("Telefone comercial"),
        t("E-mail"),
        sel("Estado pretendido de residência na Austrália", auStates),
        radOpt("Endereço postal é o mesmo que o residencial?"),
        tOpt("Endereço postal", "Preencha se diferente do residencial"),
        radOpt("Autoriza outra pessoa a receber correspondências?"),
        tOpt("Nome e dados do destinatário autorizado"),
      ],
    },
    {
      titulo: "Histórico de Endereços",
      fields: [
        ta("Endereços dos últimos 10 anos (desde os 16 anos)", "Liste todos, um por linha: país, endereço completo, suburb/estado/postcode, data de/até (deixe 'até' em branco se for o endereço atual). Não deixe lacunas no histórico."),
      ],
    },
    {
      titulo: "Histórico de Viagens",
      fields: [
        ta("Viagens dos últimos 10 anos (desde os 16 anos)", "Liste todos os países visitados fora do país de residência usual, um por linha: país, motivo da visita, data de entrada e saída."),
      ],
    },
    {
      titulo: "Qualificação Australiana",
      fields: [
        rad("Cumpriu o requisito de estudo australiano nos 6 meses anteriores a esta aplicação?"),
        dtOpt("Data de conclusão do curso", "Preencha se respondeu Sim acima"),
        rad("Algum estudo foi feito online fora da Austrália com visto de estudante entre 01/02/2020 e 15/12/2021?"),
        t("Código CRICOS do curso"),
        sel("Qualificação (nível AQF)", ["AQF Certificate III", "AQF Certificate IV", "AQF Diploma", "AQF Associate Degree", "AQF Bachelor Degree", "AQF Bachelor Honours", "AQF Graduate Certificate", "AQF Graduate Diploma", "AQF Masters Degree", "AQF Doctoral Degree"]),
        t("Nome do curso"),
        t("Nome da instituição"),
        t("Campus"),
        tOpt("Postcode do campus"),
        selOpt("Estado do campus", auStates),
        dt("Data de início do curso"),
        dt("Data de conclusão do curso"),
      ],
    },
    {
      titulo: "Idioma & Inglês",
      fields: [
        t("Idioma principal"),
        rad("Realizou teste de inglês nos últimos 12 meses?"),
        selOpt("Nome do teste", ["PTE Academic", "IELTS", "TOEFL iBT", "Cambridge C1 Advanced", "OET"]),
        dtOpt("Data do teste"),
        tOpt("Número de referência do teste"),
        tOpt("País onde realizou o teste"),
        selOpt("Nível de proficiência", ["Functional", "Vocational", "Proficient", "Superior"]),
        tOpt("Listening"),
        tOpt("Reading"),
        tOpt("Writing"),
        tOpt("Speaking"),
        tOpt("Overall / Score geral"),
      ],
    },
    {
      titulo: "Skills + AFP + Saúde",
      fields: [
        rad("Aplicou a uma autoridade avaliadora para avaliação de skills?"),
        tOpt("Ocupação nominada"),
        tOpt("Autoridade avaliadora"),
        dtOpt("Data da avaliação"),
        tOpt("Número de referência (skills)"),
        rad("Todos os requerentes com 16+ anos solicitaram AFP (Australian Federal Police check) nos últimos 12 meses?"),
        dtOpt("Data da solicitação AFP"),
        tOpt("Número de referência AFP"),
        rad("Todos os requerentes têm seguro saúde?", SN, "OSHC não é aceito para o Subclass 485 — é necessário OVHC"),
        selOpt("Tipo de seguro", ["OVHC", "Seguro saúde privado", "Nenhum"]),
        tOpt("Nome da seguradora"),
        dtOpt("Cobertura de"),
        dtOpt("Cobertura até"),
      ],
    },
    {
      titulo: "Declarações de Saúde e Caráter",
      fields: [
        rad("Nos últimos 5 anos, viveu ou visitou país fora do passaporte por mais de 3 meses consecutivos (excluindo Austrália)?"),
        rad("Pretende ser internado em hospital ou facility de saúde na Austrália?"),
        rad("Pretende trabalhar, estudar ou se treinar como profissional de saúde na Austrália?"),
        rad("Pretende trabalhar em aged care ou disability care na Austrália?"),
        rad("Pretende trabalhar em creche ou childcare centre na Austrália?"),
        rad("Pretende ficar em sala de aula por mais de 3 meses (aluno, professor ou observador)?"),
        rad("Já teve tuberculose, contato próximo com TB ativa, ou raio-x com anormalidade?"),
        rad("Espera incorrer custos médicos ou requerer tratamento (câncer, AIDS, doença renal, gravidez, etc.)?"),
        rad("Requer cuidados médicos contínuos ou equipamentos especiais para vida diária?"),
        rad("Foi acusado de crime aguardando ação legal?"),
        rad("Já foi condenado por crime em qualquer país (incluindo convicções removidas de registro)?"),
        rad("Já foi sujeito a ordem de violência doméstica ou familiar?"),
        rad("Já foi sujeito a mandado de prisão ou notificação da Interpol?"),
        rad("Já foi considerado culpado de ofensa sexual envolvendo criança?"),
        rad("Está em algum registro de ofensores sexuais?"),
        rad("Já foi absolvido de crime por insanidade?"),
        rad("Já foi considerado inapto a comparecer perante tribunal?"),
        rad("Já esteve envolvido em atividades que representem risco à segurança nacional?"),
        rad("Já foi acusado de genocídio, crimes de guerra, crimes contra humanidade, tortura ou escravidão?"),
        rad("Já foi associado a pessoa/organização envolvida em conduta criminosa?"),
        rad("Já foi associado a organização envolvida em violência?"),
        rad("Já serviu em força militar, policial, milícia ou agência de inteligência?"),
        rad("Já teve treinamento militar/paramilitar ou em explosivos/produtos químicos?"),
        rad("Já esteve envolvido em tráfico de pessoas?"),
        rad("Já foi removido, deportado ou excluído de algum país?"),
        rad("Já ultrapassou a validade de um visto em qualquer país?"),
        rad("Tem dívidas pendentes com o governo australiano?"),
        t("Assinatura digital (nome completo)"),
        dt("Data da assinatura"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Template 2 · Formulário 482 Subsequent Entrant
// ---------------------------------------------------------------------------

const FORM_482 = {
  nome: "Formulário 482 Subsequent Entrant — Coleta de Dados",
  serviceTypeNames: ["Subclass 482 — Subsequent Entrant"],
  steps: [
    {
      titulo: "Dados do Visto Principal",
      fields: [
        t("Número de referência do visto principal (TRN)", "TRN disponível no ImmiAccount ou na confirmação de aplicação do titular principal"),
        dt("Data de nascimento do titular principal"),
        sel("Relacionamento com o titular principal", ["Cônjuge", "Parceiro(a) de facto", "Filho(a)"]),
        rad("O dependente foi incluído na indicação (nomination)?"),
        rad("Localização atual do dependente", ["Austrália", "Fora da Austrália"]),
      ],
    },
    {
      titulo: "Dados Pessoais",
      fields: [
        t("Nome (conforme passaporte)"),
        t("Sobrenome (conforme passaporte)"),
        radOpt("Já foi conhecido por outro nome?"),
        tOpt("Detalhe do(s) outro(s) nome(s)"),
        rad("Gênero", ["Masculino", "Feminino", "Outro"]),
        dt("Data de nascimento"),
        t("Cidade de nascimento"),
        t("País de nascimento"),
        sel("Estado civil", estadoCivil),
        t("Nacionalidade atual"),
        radOpt("Possui outra cidadania?"),
        tOpt("Qual país (outra cidadania)"),
      ],
    },
    {
      titulo: "Passaporte",
      fields: [
        t("Número do passaporte"),
        t("País de emissão"),
        t("Nacionalidade conforme passaporte"),
        dt("Data de emissão"),
        dt("Data de validade"),
        t("Local de emissão"),
        radOpt("Possui ou já possuiu outro passaporte?"),
        tOpt("Detalhe (país, número, validade)"),
        radOpt("Possui número de concessão de visto australiano anterior?"),
        tOpt("Australian Visa Grant Number"),
        radOpt("Possui carteira de identidade nacional?"),
        selOpt("Tipo de documento", ["RG (Brasil)", "CNH", "Carteira de Trabalho", "Outro"]),
        tOpt("Número do documento"),
        tOpt("País de emissão do documento"),
        radOpt("Possui outros documentos de viagem?"),
        taOpt("Descreva outros documentos de viagem"),
      ],
    },
    {
      titulo: "Contato e Endereço",
      fields: [
        t("País de residência habitual"),
        t("Endereço residencial completo", "Endereço de rua obrigatório — caixa postal não é aceita"),
        t("Suburb / Cidade"),
        t("Estado"),
        t("CEP / Postcode"),
        t("País"),
        tOpt("Telefone residencial"),
        tOpt("Telefone comercial"),
        t("Celular"),
        t("E-mail"),
      ],
    },
    {
      titulo: "Histórico de Residência",
      fields: [
        ta("Endereços dos últimos 10 anos (desde os 16 anos)", "Liste país, endereço completo e período (de/até) de cada residência com 12+ meses cumulativos"),
      ],
    },
    {
      titulo: "Histórico de Viagens e Saúde",
      fields: [
        rad("Nos últimos 10 anos, visitou algum país fora do seu país de residência habitual?"),
        taOpt("Detalhe as viagens", "País, motivo, datas de/até"),
        rad("Já realizou exame de saúde para visto australiano nos últimos 12 meses?"),
        tOpt("HAP ID ou detalhes do exame"),
      ],
    },
    {
      titulo: "Saúde e Caráter",
      fields: [
        rad("Nos últimos 5 anos, viveu fora do país de passaporte por mais de 3 meses consecutivos (excluindo Austrália)?"),
        rad("Pretende ser internado em hospital ou instalação de saúde na Austrália?"),
        rad("Pretende trabalhar ou estudar como profissional de saúde na Austrália?"),
        rad("Possui alguma condição de saúde relevante (TB, doença cardíaca, HIV, doença renal, doença mental, gravidez, etc.)?"),
        taOpt("Descreva a condição de saúde"),
        rad("Já foi condenado por crime em qualquer país?"),
        taOpt("Data, natureza do crime, sentença"),
        rad("Possui acusação criminal pendente?"),
        taOpt("Descreva a acusação"),
        rad("Já foi removido, deportado ou excluído de qualquer país?"),
        taOpt("Descreva a remoção/deportação"),
        rad("Já excedeu o período de permanência autorizado (overstay) em algum visto?"),
        taOpt("País, visto, período do overstay"),
        rad("Já foi associado a atividades que representem risco à segurança nacional?"),
      ],
    },
    {
      titulo: "Declaração e Assinatura",
      fields: [
        t("Assinatura digital (nome completo)"),
        dt("Data"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Template 3 · Formulário de Visto de Turista (Subclass 600)
// ---------------------------------------------------------------------------

const FORM_600 = {
  nome: "Formulário Visto de Turista (Subclass 600) — Coleta de Dados",
  serviceTypeNames: ["Tourist Visa — Subclass 600"],
  createServiceType: true,
  steps: [
    {
      titulo: "Dados Pessoais",
      fields: [
        t("Nome"),
        t("Sobrenome"),
        tOpt("Outros nomes já utilizados", "Nome de solteiro(a), apelido legal, etc."),
        rad("Gênero", ["Masculino", "Feminino", "Outro"]),
        dt("Data de nascimento"),
        t("Cidade de nascimento"),
        t("País de nascimento"),
        sel("Estado civil", estadoCivil),
        t("Nacionalidade atual"),
        rad("Possui, ou já possuiu, outra nacionalidade ou cidadania?"),
        tOpt("Qual nacionalidade"),
        selOpt("Nível de escolaridade", ["Ensino Fundamental", "Ensino Médio", "Ensino Superior", "Pós-Graduação", "Outro"]),
      ],
    },
    {
      titulo: "Passaporte",
      fields: [
        t("Número do passaporte"),
        t("País de emissão"),
        t("Nacionalidade conforme passaporte"),
        dt("Data de emissão"),
        dt("Data de validade"),
        t("Local de emissão"),
        rad("Possui, ou já possuiu, outro passaporte?"),
        tOpt("Detalhes (país, número, validade)"),
        t("RG / Documento de identidade"),
        t("CPF"),
      ],
    },
    {
      titulo: "Contato e Endereço",
      fields: [
        t("Endereço residencial completo", "Não pode ser caixa postal"),
        t("Cidade"),
        t("Estado"),
        t("CEP"),
        t("País", "Padrão: Brasil"),
        tOpt("Telefone residencial"),
        tOpt("Telefone comercial"),
        t("Celular"),
        t("E-mail"),
        tOpt("Endereço para correspondência", "Deixe em branco se for o mesmo do residencial"),
      ],
    },
    {
      titulo: "Família",
      fields: [
        tOpt("Nome completo do cônjuge/parceiro(a)", "Preencha mesmo se não estiver viajando junto"),
        dtOpt("Data de nascimento do cônjuge"),
        tOpt("Nacionalidade do cônjuge"),
        tOpt("Número do passaporte do cônjuge"),
        radOpt("O cônjuge/parceiro(a) irá acompanhá-lo(a) na viagem?"),
        rad("Você tem filhos?"),
        taOpt("Nome, data de nascimento e se viaja junto (cada filho)"),
        t("Nome da mãe"),
        t("Nome do pai"),
        rad("Tem algum familiar ou amigo na Austrália?"),
        taOpt("Nome, relação e endereço na Austrália"),
      ],
    },
    {
      titulo: "Detalhes da Viagem",
      fields: [
        sel("Motivo da viagem à Austrália", ["Turismo", "Visitar família/amigos", "Negócios", "Estudo de curta duração (até 12 semanas)", "Tratamento médico", "Outro"]),
        dt("Data prevista de chegada na Austrália"),
        sel("Tempo de permanência pretendido", ["Até 2 semanas", "2 a 4 semanas", "1 a 3 meses", "3 a 6 meses", "6 a 12 meses"]),
        t("Endereço na Austrália onde pretende ficar"),
        tOpt("Cidades ou regiões que pretende visitar"),
        rad("Alguém está te acompanhando nesta viagem?"),
        tOpt("Nome(s) e relação do(s) acompanhante(s)"),
      ],
    },
    {
      titulo: "Trabalho e Finanças",
      fields: [
        sel("Situação profissional atual", ["Empregado(a)", "Autônomo(a)", "Empresário(a)", "Aposentado(a)", "Estudante", "Do lar", "Desempregado(a)"]),
        tOpt("Nome da empresa/instituição"),
        tOpt("Cargo/função"),
        tOpt("Endereço da empresa"),
        tOpt("Telefone da empresa"),
        sel("Quem custeará sua viagem?", ["Eu mesmo(a)", "Cônjuge/parceiro(a)", "Pais", "Empresa", "Patrocinador na Austrália", "Outro"]),
        sel("Renda mensal aproximada (BRL)", ["Até R$ 3.000", "R$ 3.001 a R$ 6.000", "R$ 6.001 a R$ 10.000", "R$ 10.001 a R$ 20.000", "Acima de R$ 20.000"]),
        tOpt("Valor estimado em fundos disponíveis para a viagem"),
      ],
    },
    {
      titulo: "Histórico de Viagens",
      fields: [
        rad("Já visitou a Austrália antes?"),
        taOpt("Datas, duração e tipo de visto"),
        rad("Já solicitou visto para a Austrália antes?"),
        taOpt("Tipo de visto, data e resultado"),
        radOpt("Já solicitou residência permanente na Austrália nos últimos 5 anos?"),
        tOpt("Detalhes da solicitação de residência permanente"),
        taOpt("Países visitados nos últimos 10 anos", "Liste países e datas aproximadas"),
        taOpt("Vistos anteriores para Austrália ou outro país", "Descreva"),
      ],
    },
    {
      titulo: "Saúde e Caráter",
      fields: [
        rad("Possui alguma condição de saúde que possa requerer tratamento durante a estadia na Austrália?"),
        taOpt("Descreva a condição de saúde"),
        rad("Pretende trabalhar ou prestar serviços profissionais na Austrália durante a estadia?"),
        rad("Já foi condenado por crime em qualquer país?"),
        taOpt("Descreva: crime, país, data, pena"),
        rad("Possui acusação criminal pendente?"),
        taOpt("Descreva a acusação"),
        rad("Já descumpriu condições de visto ou excedeu o período autorizado de permanência em qualquer país?"),
        taOpt("Descreva o descumprimento/overstay"),
        rad("Já teve pedido de visto recusado ou cancelado em qualquer país?"),
        taOpt("Descreva a recusa/cancelamento"),
      ],
    },
    {
      titulo: "Declaração e Assinatura",
      fields: [
        t("Assinatura digital (nome completo)"),
        dt("Data"),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Template 4 · Formulário US Visa B1/B2
// ---------------------------------------------------------------------------

const FORM_USA = {
  nome: "Formulário US Visa B1/B2 — Coleta de Dados",
  serviceTypeNames: ["US Visa B1/B2"],
  createServiceType: true,
  steps: [
    {
      titulo: "Viajantes",
      fields: [
        sel("Quantidade de viajantes", ["Apenas eu", "Eu e mais 1 pessoa", "3 ou mais pessoas"], "Para casais/famílias, a equipe entra em contato para coletar os dados dos demais viajantes individualmente. Os campos abaixo são do Viajante 1."),
      ],
    },
    {
      titulo: "Dados Pessoais",
      fields: [
        t("Sobrenome", "Conforme passaporte"),
        t("Nome(s)", "Conforme passaporte"),
        tOpt("Nome completo em idioma nativo"),
        tOpt("Já usou outros nomes (solteira, casada)?"),
        sel("Sexo", ["Feminino", "Masculino"]),
        dt("Data de nascimento"),
        sel("Estado civil", ["Solteiro(a)", "Casado(a)", "União estável (Common Law)", "Divorciado(a)", "Viúvo(a)"]),
        t("Cidade de nascimento"),
        t("País de nascimento"),
        sel("Nacionalidade", ["Brasileira", "Australiana", "Outra"]),
        radOpt("Possui outra nacionalidade?"),
      ],
    },
    {
      titulo: "Contacto e Endereço",
      fields: [
        t("Endereço completo"),
        t("Cidade"),
        t("Estado"),
        t("Postcode"),
        sel("País de residência", ["Austrália", "Brasil", "Outro"]),
        radOpt("Endereço de correspondência igual ao residencial?"),
        t("Telefone principal"),
        tOpt("Telefone secundário"),
        t("E-mail"),
        tOpt("Rede social principal"),
      ],
    },
    {
      titulo: "Passaporte",
      fields: [
        t("Número do passaporte"),
        t("País emissor"),
        tOpt("Cidade de emissão"),
        dt("Data de emissão"),
        dt("Data de validade"),
        radOpt("Já perdeu ou teve um passaporte roubado?"),
      ],
    },
    {
      titulo: "Informações da Viagem",
      fields: [
        sel("Propósito da viagem", ["Turismo (B2)", "Negócios (B1)", "Turismo e Negócios (B1/B2)", "Visitar amigos ou familiares", "Tratamento médico", "Conferência ou evento"]),
        sel("Cidade preferida para a entrevista", ["Sydney", "Melbourne", "Perth"]),
        dt("Data prevista de chegada aos EUA"),
        t("Tempo de permanência previsto"),
        t("Endereço onde ficará nos EUA"),
        sel("Quem paga a viagem?", ["Eu mesmo(a)", "Empregador", "Familiar nos EUA", "Familiar no Brasil ou Austrália", "Outra pessoa"]),
        radOpt("Viaja com outras pessoas?"),
        tOpt("Quem viaja com você (nomes e relação)"),
        ta("Descreva o motivo da viagem"),
      ],
    },
    {
      titulo: "Histórico com os Estados Unidos",
      fields: [
        rad("Já esteve nos EUA antes?"),
        rad("Já teve visto americano?"),
        taOpt("Datas e tempo das estadias anteriores"),
        dtOpt("Data de emissão do último visto"),
        tOpt("Número do visto"),
        rad("Já teve visto americano recusado?"),
        radOpt("Já foi impedido(a) de entrar nos EUA?"),
        taOpt("Detalhes da recusa", "Omitir recusas anteriores é considerado fraude"),
      ],
    },
    {
      titulo: "Contacto nos Estados Unidos",
      fields: [
        t("Nome do contacto ou organização"),
        sel("Relação com você", ["Hotel", "Amigo(a)", "Familiar", "Parceiro de negócios", "Outro"]),
        t("Endereço completo do contacto"),
        tOpt("Telefone do contacto"),
        tOpt("E-mail do contacto"),
      ],
    },
    {
      titulo: "Informações Familiares",
      fields: [
        t("Sobrenome do pai"),
        t("Nome do pai"),
        dtOpt("Data de nascimento do pai"),
        radOpt("Pai está nos EUA?"),
        t("Sobrenome da mãe"),
        t("Nome da mãe"),
        dtOpt("Data de nascimento da mãe"),
        radOpt("Mãe está nos EUA?"),
        tOpt("Nome completo do cônjuge"),
        dtOpt("Data de nascimento do cônjuge"),
        tOpt("Nacionalidade do cônjuge"),
        tOpt("Cidade de nascimento do cônjuge"),
        rad("Possui parentes nos EUA (irmãos, primos, tios, avós)?"),
        taOpt("Liste todos os parentes nos EUA", "Omitir parentes nos EUA é considerado fraude"),
      ],
    },
    {
      titulo: "Emprego e Educação",
      fields: [
        sel("Ocupação principal", ["Empregado(a)", "Autônomo(a)", "Estudante", "Empresário(a)", "Aposentado(a)", "Desempregado(a)", "Dona de casa", "Outro"]),
        tOpt("Cargo / Função"),
        t("Nome do empregador"),
        tOpt("Telefone do empregador"),
        t("Endereço completo do empregador"),
        dtOpt("Data de início no emprego atual"),
        tOpt("Salário mensal (AUD ou BRL)"),
        ta("Descreva detalhadamente as suas funções", "Quanto mais detalhada e profissional a descrição, mais credibilidade transmite ao oficial consular"),
        taOpt("Empregos anteriores", "Empregador, cargo, início, saída e descrição das funções — um por linha"),
        taOpt("Formação educacional", "Instituição, curso/nível, datas de início e conclusão, cidade e país — um por linha"),
      ],
    },
    {
      titulo: "Status Migratório na Austrália",
      fields: [
        sel("Tipo de visto australiano atual", ["Cidadão australiano", "Permanent Resident", "Student (Subclass 500)", "Graduate (Subclass 485)", "Skilled (190, 189, 491)", "Partner (820, 309)", "Work and Holiday (462) ou WHV (417)", "Bridging Visa", "Tourist (600)", "Outro"]),
        t("Validade do visto australiano"),
        t("Há quanto tempo mora na Austrália?"),
      ],
    },
    {
      titulo: "Histórico de Viagens e Background",
      fields: [
        ta("Países visitados nos últimos 5 anos"),
        t("Idiomas que fala"),
        radOpt("Já serviu o exército?"),
        rad("Já foi preso(a) ou condenado(a)?"),
        rad("Tem alguma doença infecto-contagiosa?"),
        rad("Já foi deportado(a) de algum país?"),
        rad("Já permaneceu além do permitido em algum visto?"),
      ],
    },
    {
      titulo: "Declaração e Assinatura",
      fields: [
        t("Nome completo (assinatura digital)"),
        dt("Data"),
      ],
    },
  ],
};

const ALL_FORMS = [FORM_485, FORM_482, FORM_600, FORM_USA];

async function getOrCreateServiceType(nome) {
  const { data: existing } = await s.from("service_types").select("id").eq("nome", nome).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await s.from("service_types").insert({ nome }).select("id").single();
  if (error) throw new Error(`Falha ao criar service_type ${nome}: ${error.message}`);
  console.log(`  service_type criado: ${nome}`);
  return data.id;
}

for (const form of ALL_FORMS) {
  console.log(`\n=== ${form.nome} ===`);

  // Idempotência: remove template existente com o mesmo nome (cascade cuida de steps/fields)
  await s.from("case_form_templates").delete().eq("nome", form.nome);

  const primaryServiceTypeId = await getOrCreateServiceType(form.serviceTypeNames[0]);

  const { data: template, error: tplError } = await s
    .from("case_form_templates")
    .insert({ service_type_id: primaryServiceTypeId, nome: form.nome })
    .select("id")
    .single();
  if (tplError) throw new Error(tplError.message);
  console.log(`  template: ${template.id}`);

  let totalFields = 0;
  for (let i = 0; i < form.steps.length; i++) {
    const step = form.steps[i];
    const { data: stepRow, error: stepError } = await s
      .from("case_form_steps")
      .insert({ template_id: template.id, ordem: i + 1, titulo: step.titulo })
      .select("id")
      .single();
    if (stepError) throw new Error(stepError.message);

    const fieldRows = step.fields.map((f, j) => ({
      step_id: stepRow.id,
      ordem: j + 1,
      label: f.label,
      ajuda: f.ajuda ?? null,
      tipo: f.tipo,
      opcoes: f.opcoes ?? null,
      obrigatorio: f.obrigatorio,
    }));
    const { error: fieldsError } = await s.from("case_form_fields").insert(fieldRows);
    if (fieldsError) throw new Error(fieldsError.message);
    totalFields += fieldRows.length;
    console.log(`  etapa ${i + 1} "${step.titulo}": ${fieldRows.length} campos`);
  }
  console.log(`  total: ${form.steps.length} etapas, ${totalFields} campos`);

  // Aponta todos os service_types relacionados para este template (auto-derivação
  // igual aos checklists — ver comentário no schema).
  for (const stName of form.serviceTypeNames) {
    const stId = await getOrCreateServiceType(stName);
    await s.from("service_types").update({ case_form_template_id: template.id }).eq("id", stId);
  }
}

console.log("\nImportação concluída.");
