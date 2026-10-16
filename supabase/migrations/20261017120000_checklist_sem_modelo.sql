-- KMP Hub · Checklist sem modelo (pedidos avulsos ao cliente).
--
-- "Pedir ao cliente" (tradução, documento extra) vira um item de checklist
-- com status 'solicitado': aparece em "Pedidos para você" no portal, com
-- envio por item, motivo e prazo — tudo o que o checklist já tinha. Processo
-- de visto sem modelo de checklist (ex.: US B1/B2, recurso AAT) não tinha
-- onde guardar o pedido, porque checklists.checklist_template_id era
-- obrigatório. Agora pode ser nulo: o checklist nasce vazio e só recebe os
-- pedidos avulsos. O trigger que copia itens do modelo não copia nada quando
-- o modelo é nulo. Nenhuma política RLS muda (a visibilidade continua
-- seguindo o processo).

alter table public.checklists alter column checklist_template_id drop not null;

comment on column public.checklists.checklist_template_id is
  'Modelo de onde os itens foram copiados. Nulo = checklist só com pedidos avulsos (processo sem modelo de checklist).';

notify pgrst, 'reload schema';
