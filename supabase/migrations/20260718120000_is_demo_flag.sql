-- KMP Hub · Sprint 8 (Parte 1) · Flag de dados de demonstração
--
-- is_demo = true marca registros fictícios criados pelo seed
-- (scripts/seed-demo.mjs), permitindo remoção completa com um único comando
-- (scripts/clean-demo.mjs) sem tocar em dados reais. Tabelas-filhas
-- (lead_events, checklists, dependentes etc.) não precisam da flag: são
-- removidas em cascata pelas FKs quando o registro-pai demo é excluído.

alter table public.leads add column is_demo boolean not null default false;
alter table public.clients add column is_demo boolean not null default false;
alter table public.cases add column is_demo boolean not null default false;
alter table public.service_types add column is_demo boolean not null default false;
alter table public.tasks add column is_demo boolean not null default false;
alter table public.appointments add column is_demo boolean not null default false;
alter table public.guides add column is_demo boolean not null default false;
alter table public.message_templates add column is_demo boolean not null default false;

create index leads_is_demo_idx on public.leads (is_demo) where is_demo;
create index clients_is_demo_idx on public.clients (is_demo) where is_demo;
create index cases_is_demo_idx on public.cases (is_demo) where is_demo;
