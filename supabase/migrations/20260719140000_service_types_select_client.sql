-- KMP Hub · Portal precisa ler service_types.case_form_template_id para
-- saber qual formulário de dados carregar para o processo do cliente. A
-- política original do Sprint 4 ("sem acesso para parceiro/cliente") era
-- válida quando só a equipe configurava tipos de serviço — agora o portal
-- precisa enxergar o tipo de serviço do(s) PRÓPRIO(S) processo(s), nada além.

create policy service_types_select_client on public.service_types
  for select
  using (
    public.get_user_role() in ('client', 'partner')
    and exists (
      select 1
      from public.cases c
      join public.client_access ca on ca.client_id = c.client_id
      where c.service_type_id = service_types.id
        and (ca.client_user_id = auth.uid() or ca.partner_id = auth.uid())
    )
  );
