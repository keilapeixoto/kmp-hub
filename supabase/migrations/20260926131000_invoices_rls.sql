-- KMP Hub · RLS de invoices/invoice_items. Decisão da Keila: só admin e
-- finance criam/veem invoices (nada de director/consultant/operations/
-- partner/client nesta v1 — pode abrir depois se pedido).

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy invoices_manage_admin_finance on public.invoices
  for all
  using (public.get_user_role() in ('admin', 'finance'))
  with check (public.get_user_role() in ('admin', 'finance'));

create policy invoice_items_manage_admin_finance on public.invoice_items
  for all
  using (public.get_user_role() in ('admin', 'finance'))
  with check (public.get_user_role() in ('admin', 'finance'));
