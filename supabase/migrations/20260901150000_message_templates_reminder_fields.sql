-- KMP Hub · Templates de lembrete editáveis pela equipe, sem precisar mexer
-- em código (pedido da Keila depois de dois builds quebrados por edição
-- direta de lib/case-deadlines/email-templates.ts no GitHub).
--
-- assunto: linha de assunto do e-mail (só relevante para canal = email).
-- chave: identificador estável usado pelo sistema para localizar um template
-- específico por código (ex. os 4 lembretes automáticos do prazo de 28 dias)
-- — nome continua sendo só o rótulo visível pra equipe, pode mudar livremente
-- sem quebrar a busca. Templates sem chave (a maioria) continuam só cópia
-- manual, como já era.

alter table public.message_templates
  add column assunto text,
  add column chave text unique;

comment on column public.message_templates.assunto is
  'Linha de assunto do e-mail (só relevante para canal = email). Aceita as mesmas variáveis {{...}} do corpo.';
comment on column public.message_templates.chave is
  'Identificador estável usado pelo sistema para localizar um template específico por código (ex. lembrete_prazo_14). Null nos templates de cópia manual (a maioria) — só os automáticos têm chave.';

insert into public.message_templates (nome, canal, idioma, chave, assunto, corpo) values
(
  'Lembrete de prazo — 14 dias',
  'email',
  'pt',
  'lembrete_prazo_14',
  'Lembrete: Documento pendente para sua aplicação de visto!',
  $$Olá {{nome_estudante}},

Espero que esteja bem.

Este é um lembrete de que o Department of Home Affairs solicitou {{tipo_documento}} para o andamento da sua aplicação de visto.

O prazo final para envio é {{data_limite}}.

Peço que assim que possível você me envie esse documento, para garantir que tudo seja anexado à aplicação dentro do prazo.

Qualquer dúvida sobre como obter ou enviar o documento, estou à disposição.$$
),
(
  'Lembrete de prazo — 7 dias',
  'email',
  'pt',
  'lembrete_prazo_7',
  'Prazo se aproximando: Documento ainda pendente!',
  $$Olá {{nome_estudante}},

Faltam {{dias_restantes}} dias para o prazo final de {{data_limite}} referente a {{tipo_documento}} da sua aplicação de visto.

Ainda não recebi esse documento. Peço que você me envie o quanto antes, porque o Department não costuma aceitar atraso nesse tipo de prazo.

Se já enviou e eu não recebi, por favor me avise para verificarmos juntos.$$
),
(
  'Lembrete de prazo — 3 dias',
  'email',
  'pt',
  'lembrete_prazo_3',
  'Urgente: Faltam {{dias_restantes}} dias para o prazo da sua aplicação!',
  $$Olá {{nome_estudante}},

Faltam apenas {{dias_restantes}} dias para o prazo final de {{data_limite}} referente a {{tipo_documento}}.

Este documento ainda não chegou até mim.

Preciso que você envie hoje ou amanhã, porque perder esse prazo pode gerar consequências sérias para sua aplicação de visto, incluindo possível recusa.

Se está com alguma dificuldade para obter o documento, me avise agora mesmo para vermos juntos uma solução antes que o prazo vença.$$
),
(
  'Lembrete de prazo — 1 dia (último aviso)',
  'email',
  'pt',
  'lembrete_prazo_1',
  'Último aviso: Prazo vence amanhã, {{data_limite}}!',
  $$Olá {{nome_estudante}},

Este é o último lembrete automático. O prazo para envio de {{tipo_documento}} vence amanhã, {{data_limite}}.

Se esse documento não for enviado até o prazo, sua aplicação de visto corre risco real de ser recusada por falta de resposta ao Department dentro do tempo estipulado.

Por favor, me envie o documento hoje, ou entre em contato comigo imediatamente se houver algum impedimento, para que possamos avaliar as opções ainda disponíveis.$$
);
