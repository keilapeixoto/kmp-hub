-- KMP Hub · Ocupações — referência de elegibilidade de skilled occupation
-- list (docs/superpowers/specs/2026-09-24-ocupacoes-design.md). Substitui a
-- consulta manual ao site da Delta Immigration por uma referência própria,
-- com fonte oficial (Department of Home Affairs) e as duas classificações
-- que importam para a equipe: CSOL (lista vigente) e MLTSSL legada (ainda
-- relevante para elegibilidade em streams do visto 485).

create table public.occupations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_anzsco text not null,
  categoria text not null check (
    categoria in (
      'Gerentes',
      'Profissionais',
      'Técnicos e Trabalhadores de Ofícios',
      'Trabalhadores de Serviços Comunitários e Pessoais'
    )
  ),
  autoridade_avaliadora text not null,
  nivel_habilidade integer not null check (nivel_habilidade between 1 and 5),
  na_csol boolean not null default false,
  na_mltssl_legada boolean not null default false,
  fonte text,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo_anzsco)
);

comment on table public.occupations is
  'Referência de ocupações qualificadas (código ANZSCO, autoridade avaliadora, CSOL vigente e MLTSSL legada para o visto 485). Fonte oficial: Home Affairs Skilled Occupation List. Populada via seed inicial + importação de CSV pelo admin em /configuracoes/ocupacoes — não é uma cópia completa da lista oficial (~1000 ocupações).';

create index occupations_categoria_idx on public.occupations (categoria);

create trigger set_updated_at
  before update on public.occupations
  for each row execute function public.set_updated_at();

alter table public.occupations enable row level security;

-- Ocupações (biblioteca de referência, mesmo grupo de acesso de guias/
-- templates para a equipe). É dado público (código ANZSCO, autoridade
-- avaliadora, listas) sem nota interna nessa tabela, por isso também
-- liberado para o cliente no portal — decisão registrada no spec.

create policy occupations_manage_admin on public.occupations
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy occupations_select_staff on public.occupations
  for select
  using (
    public.get_user_role() in ('director', 'consultant', 'operations', 'finance')
    and status = 'ativo'
  );

create policy occupations_select_client on public.occupations
  for select
  using (
    public.get_user_role() = 'client'
    and status = 'ativo'
  );

-- Seed inicial: ocupações mais comuns no perfil de cliente da KMP
-- (construção, engenharia, TI, saúde, contabilidade), a partir da lista
-- combinada oficial do Home Affairs (setembro/2026). Cobre 3 das 4
-- categorias — "Trabalhadores de Serviços Comunitários e Pessoais" fica
-- para o admin completar via importação de CSV: é uma categoria de skill
-- level majoritariamente 3-4 com elegibilidade variável por lista/rodada
-- que não deve ser assumida sem checar a fonte oficial.

insert into public.occupations
  (nome, codigo_anzsco, categoria, autoridade_avaliadora, nivel_habilidade, na_csol, na_mltssl_legada, fonte)
values
  ('Construction Project Manager', '133111', 'Gerentes', 'VETASSESS', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Engineering Manager', '133211', 'Gerentes', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Child Care Centre Manager', '134111', 'Gerentes', 'ACECQA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Civil Engineer', '233211', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Electrical Engineer', '233311', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Mechanical Engineer', '233512', 'Profissionais', 'Engineers Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Software Engineer', '261313', 'Profissionais', 'Australian Computer Society (ACS)', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Accountant (General)', '221111', 'Profissionais', 'CPA Australia / CA ANZ / IPA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Registered Nurse (Aged Care)', '254412', 'Profissionais', 'ANMAC', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('General Practitioner', '253111', 'Profissionais', 'Medical Board of Australia', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Early Childhood (Pre-primary School) Teacher', '241111', 'Profissionais', 'ACECQA', 1, true, true, 'Home Affairs — Skilled Occupation List'),
  ('Electrician (General)', '341111', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List'),
  ('Carpenter', '331212', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List'),
  ('Chef', '351311', 'Técnicos e Trabalhadores de Ofícios', 'Trades Recognition Australia (TRA)', 3, true, false, 'Home Affairs — Skilled Occupation List');
