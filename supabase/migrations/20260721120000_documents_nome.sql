-- KMP Hub · Nome de exibição do documento, editável pela equipe — até aqui
-- o nome mostrado era sempre o nome bruto do arquivo enviado (ex.:
-- "IMG_20260304_scan_final(2).pdf"). null significa "usar o nome do arquivo
-- enviado" (comportamento atual, sem quebrar nada existente).

alter table public.documents add column nome text;
