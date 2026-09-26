-- KMP Hub · Ocupações — matriz de elegibilidade por subclasse de visto.
-- Pedido pela cliente após ver a referência da Delta Immigration: mostrar,
-- por ocupação, quais subclasses de visto de qualificação ela normalmente
-- habilita (189/190/491/482/494/186/407/485). Escopo explicitamente
-- reduzido: nada de cotas por estado nem histórico de pontuação por
-- rodada de convite (dado volátil, não pedido — ver "Fora de escopo (v1)"
-- em docs/superpowers/specs/2026-09-24-ocupacoes-design.md).
--
-- Colunas nullable de propósito: null = "não informado/a confirmar" (dado
-- ainda não revisado pela equipe), distinto de false = "confirmado que não
-- há elegibilidade". Evita a migração afirmar uma regra de imigração sem
-- fonte oficial checada linha a linha.

alter table public.occupations
  add column visto_189 boolean,
  add column visto_190 boolean,
  add column visto_491 boolean,
  add column visto_482 boolean,
  add column visto_494 boolean,
  add column visto_186 boolean,
  add column visto_407 boolean,
  add column visto_485 boolean;

comment on column public.occupations.visto_189 is 'Skilled Independent (189) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_190 is 'Skilled Nominated (190) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_491 is 'Skilled Work Regional (491) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_482 is 'Temporary Skill Shortage (482) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_494 is 'Skilled Employer Sponsored Regional (494) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_186 is 'Employer Nomination Scheme (186) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_407 is 'Training visa (407) — elegibilidade típica da ocupação. Null = não informado.';
comment on column public.occupations.visto_485 is 'Temporary Graduate (485) — elegibilidade típica da ocupação. Null = não informado.';
