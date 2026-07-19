-- KMP Hub · Sprint 6 · RLS de tasks, task_comments, appointments e
-- appointment_summaries. Referência: seção 5 do plano —
--   Tarefas: Admin G · Diretor G · Consultor próprias + criadas ·
--            Operacional próprias · Financeiro próprias · Parceiro/Cliente sem acesso
--   Agenda:  Admin G · Diretor G · Consultor própria + clientes ·
--            Operacional própria · Financeiro própria · Parceiro sem acesso ·
--            Cliente próprios compromissos

alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_summaries enable row level security;

-- ---------------------------------------------------------------------------
-- tasks
-- "Próprias" = responsável ou participante; "criadas" = criado_por.
-- ---------------------------------------------------------------------------

create policy tasks_manage_staff on public.tasks
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy tasks_select_own on public.tasks
  for select
  using (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and (
      responsavel = auth.uid()
      or criado_por = auth.uid()
      or auth.uid() = any(participantes)
    )
  );

create policy tasks_insert_own on public.tasks
  for insert
  with check (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and criado_por = auth.uid()
  );

create policy tasks_update_own on public.tasks
  for update
  using (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and (
      responsavel = auth.uid()
      or criado_por = auth.uid()
      or auth.uid() = any(participantes)
    )
  )
  with check (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and (
      responsavel = auth.uid()
      or criado_por = auth.uid()
      or auth.uid() = any(participantes)
    )
  );

-- Exclusão de tarefa: só admin/diretor (via tasks_manage_staff) ou quem criou.
create policy tasks_delete_creator on public.tasks
  for delete
  using (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and criado_por = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- task_comments: visíveis/criáveis por quem vê a tarefa. Append-only.
-- ---------------------------------------------------------------------------

create policy task_comments_select on public.task_comments
  for select
  using (
    exists (select 1 from public.tasks t where t.id = task_comments.task_id)
  );

comment on policy task_comments_select on public.task_comments is
  'O EXISTS herda o RLS de tasks: se a tarefa não é visível para o usuário, o comentário também não é.';

create policy task_comments_insert on public.task_comments
  for insert
  with check (
    autor = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_comments.task_id)
  );

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------

create policy appointments_manage_staff on public.appointments
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

-- Consultor: a própria agenda + compromissos dos seus clientes.
create policy appointments_select_consultant on public.appointments
  for select
  using (
    public.get_user_role() = 'consultant'
    and (
      responsavel = auth.uid()
      or exists (
        select 1 from public.clients c
        where c.id = appointments.client_id and c.consultor_id = auth.uid()
      )
    )
  );

create policy appointments_modify_consultant on public.appointments
  for insert
  with check (public.get_user_role() = 'consultant' and responsavel = auth.uid());

create policy appointments_update_consultant on public.appointments
  for update
  using (public.get_user_role() = 'consultant' and responsavel = auth.uid())
  with check (public.get_user_role() = 'consultant' and responsavel = auth.uid());

create policy appointments_delete_consultant on public.appointments
  for delete
  using (public.get_user_role() = 'consultant' and responsavel = auth.uid());

-- Operacional e financeiro: só a própria agenda.
create policy appointments_manage_own on public.appointments
  for all
  using (
    public.get_user_role() in ('operations', 'finance')
    and responsavel = auth.uid()
  )
  with check (
    public.get_user_role() in ('operations', 'finance')
    and responsavel = auth.uid()
  );

-- Cliente: leitura dos próprios compromissos via client_access (portal, Fase 2).
create policy appointments_select_client on public.appointments
  for select
  using (
    public.get_user_role() = 'client'
    and exists (
      select 1 from public.client_access ca
      where ca.client_id = appointments.client_id and ca.client_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- appointment_summaries: contém riscos (nota interna). NENHUMA política para
-- client/partner — em nenhuma hipótese o resumo aparece no portal (seção 8,
-- risco 2). Equipe vê conforme enxerga o compromisso.
-- ---------------------------------------------------------------------------

create policy appointment_summaries_manage_staff on public.appointment_summaries
  for all
  using (public.get_user_role() in ('admin', 'director'))
  with check (public.get_user_role() in ('admin', 'director'));

create policy appointment_summaries_select_team on public.appointment_summaries
  for select
  using (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_summaries.appointment_id
    )
  );

comment on policy appointment_summaries_select_team on public.appointment_summaries is
  'O EXISTS herda o RLS de appointments — mas note que client NÃO tem política nesta tabela, então mesmo vendo o compromisso não vê o resumo.';

create policy appointment_summaries_insert_team on public.appointment_summaries
  for insert
  with check (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and autor = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_summaries.appointment_id
    )
  );

create policy appointment_summaries_update_author on public.appointment_summaries
  for update
  using (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and autor = auth.uid()
  )
  with check (
    public.get_user_role() in ('consultant', 'operations', 'finance')
    and autor = auth.uid()
  );
