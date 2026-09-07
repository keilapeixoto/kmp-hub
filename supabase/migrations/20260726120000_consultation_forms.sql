-- KMP Hub · Ficha de Consulta (migrado do protótipo standalone
-- KMP_Ficha_de_Consulta.html, que salvava só em localStorage no navegador).
--
-- Vinculada a um client_id já cadastrado no Hub (não fica solta como no
-- protótipo) — segue o mesmo modelo de posse de client_relations/
-- identity_documents: dono é quem é consultor do cliente
-- (clients.consultor_id), não um "created_by" isolado. Um cliente pode ter
-- várias fichas ao longo do tempo (uma por consulta/sessão).
--
-- O conteúdo dinâmico das 6 seções (panorama, experiência profissional,
-- trajetória acadêmica, informações importantes, caminho recomendado, plano
-- de ação) fica em `data` jsonb — mesmo formato que o protótipo já usava
-- (collectData()/loadData()), sem perder nenhum campo.
--
-- `ai_pending_sections` marca quais chaves top-level de `data` vieram de
-- preenchimento automático por IA (transcrição → extração) e ainda não
-- foram revisadas por um humano — regra já documentada no projeto
-- (CLAUDE.md / docs/architecture/11-development-roadmap.md, Fase 4):
-- nenhum conteúdo gerado por IA entra sem marcação e validação humana. A UI
-- mostra um selo enquanto a chave estiver nesse array; esvazia conforme o
-- consultor edita/confirma cada seção.

create table public.consultation_forms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  consult_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  ai_pending_sections text[] not null default array[]::text[],
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.consultation_forms is
  'Ficha de Consulta (Briefing Estratégico de Carreira e Visto) — migrada do protótipo standalone KMP_Ficha_de_Consulta.html. Uma linha por consulta/sessão; várias por cliente ao longo do tempo.';
comment on column public.consultation_forms.data is
  'Estrutura: {clientNames, date, panorama[], exp[], traj[], notes[], steps[], strategyNote, benefitNote, actions[]} — mesmo shape do protótipo original, ver lib/consultation-forms/types.ts.';
comment on column public.consultation_forms.ai_pending_sections is
  'Chaves top-level de "data" preenchidas pela extração via IA e ainda não confirmadas por um humano (ex.: {panorama,exp}). UI mostra selo "gerado por IA — revisar" enquanto a chave estiver aqui.';

create index consultation_forms_client_id_idx on public.consultation_forms (client_id);

create trigger set_updated_at
  before update on public.consultation_forms
  for each row execute function public.set_updated_at();

alter table public.consultation_forms enable row level security;

create policy consultation_forms_manage_staff on public.consultation_forms
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy consultation_forms_manage_consultant on public.consultation_forms
  for all
  using (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id = consultation_forms.client_id and c.consultor_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'consultant'
    and exists (
      select 1 from public.clients c
      where c.id = consultation_forms.client_id and c.consultor_id = auth.uid()
    )
  );
