-- KMP Hub · Sprint 4 · Diretório de consultores + operacional para a UI de
-- processos (seletor de "Equipe" do processo). Mesmo motivo de
-- list_consultants() no Sprint 2: a tabela roles é restrita a admin/diretor
-- via RLS, então precisa de uma function SECURITY DEFINER para resolver
-- nome + função de quem pode compor a equipe de um processo.

create or replace function public.list_team_members()
returns table (user_id uuid, nome text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.nome, r.nome as role
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where r.nome in ('consultant', 'operations') and p.ativo = true
  order by p.nome;
$$;

comment on function public.list_team_members is
  'Lista consultores e operacionais ativos (id, nome, função) para o seletor de equipe de um processo. SECURITY DEFINER porque roles é restrita a admin/diretor via RLS.';
