-- KMP Hub · Aplica o trigger de auditoria (já existente desde o Sprint 7) às
-- 5 tabelas novas de formulários de coleta de dados.

do $$
declare
  t text;
begin
  foreach t in array array[
    'case_form_templates', 'case_form_steps', 'case_form_fields',
    'case_forms', 'case_form_responses'
  ]
  loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I
       for each row execute function public.audit()',
      t
    );
  end loop;
end $$;
