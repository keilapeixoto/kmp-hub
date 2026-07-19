-- KMP Hub · Importação dos checklists do repositório kmp-forms
-- Gerado automaticamente a partir dos HTML do repo (não editar à mão;
-- regenerar com scripts/parse-checklists.mjs se os HTML mudarem).
--
-- Idempotente: pula templates cujo nome já existe. Cria o service_type
-- (se não existir pelo nome), o checklist_template, aponta
-- service_types.checklist_template_id e insere os itens em ordem.

do $$
declare
  v_service_type_id uuid;
  v_template_id uuid;
begin

  -- --------------------------------------------------------------------
  -- checklist-single.html → Subclass 485 — Single (16 itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = 'Checklist Subclass 485 — Single') then
    select id into v_service_type_id from public.service_types where nome = 'Subclass 485 — Single';
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values ('Subclass 485 — Single', 'Temporary Graduate Visa — Single Application')
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, 'Checklist Subclass 485 — Single')
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
      (v_template_id, 1, 'Passaporte / Passport', 'Documentos Pessoais / Personal Documents · Todas as páginas — inclusive as em branco, mesmo sem carimbo', true, false),
      (v_template_id, 2, 'Visto Atual / Current Visa', 'Documentos Pessoais / Personal Documents · Cópia do visto vigente (VEVO: immi.homeaffairs.gov.au)', true, false),
      (v_template_id, 3, 'AFP Police Check — Recibo de Solicitação / Application Receipt', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 4, 'AFP Police Check — Resultado / Result', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 5, 'Travel History', 'Documentos Pessoais / Personal Documents · PDF com todas as páginas do passaporte — incluindo as em branco', true, false),
      (v_template_id, 6, 'Comprovante de Endereço / Proof of Address', 'Documentos Pessoais / Personal Documents · Conta de luz, gás, internet, extrato bancário ou lease agreement', true, false),
      (v_template_id, 7, 'OVHC — Overseas Visitor Health Cover (Single)', 'Documentos Pessoais / Personal Documents · Contrate e envie a apólice. Pago mensalmente por você diretamente. · OSHC não é aceito para o Subclass 485 — obrigatório OVHC', true, false),
      (v_template_id, 8, 'Resultado IELTS ou PTE (PDF original)', 'Documentos Pessoais / Personal Documents · Score mínimo PTE: · Score mínimo IELTS: · Realizado nos últimos 12 meses — data limite do resultado adquirido é o dia anterior ao dia da aplicação', true, false),
      (v_template_id, 9, 'Endereços dos Últimos 10 Anos / Address History', 'Histórico / History · Sem gaps entre as datas — mês e ano de entrada e saída de cada endereço', true, false),
      (v_template_id, 10, 'Viagens dos Últimos 10 Anos / Travel History', 'Histórico / History · País, motivo e datas (mês e ano) de todas as viagens fora da Austrália', true, false),
      (v_template_id, 11, 'Skills Assessment — Solicitação / Application', 'Skills Assessment', true, false),
      (v_template_id, 12, 'Skills Assessment — Aprovação / Approval Result', 'Skills Assessment · Caso ainda não tenha iniciado e queira realizar seu processo com a KMP, nos avise, pois também oferecemos esse serviço.', true, false),
      (v_template_id, 13, 'Completion Letter', 'Documentos da Escola / Education Documents · Carta de conclusão emitida pela instituição de ensino', true, false),
      (v_template_id, 14, 'Academic Results', 'Documentos da Escola / Education Documents · Resultados acadêmicos / transcript final do curso', true, false),
      (v_template_id, 15, 'Certificate', 'Documentos da Escola / Education Documents · Certificado de conclusão emitido pela instituição', true, false),
      (v_template_id, 16, 'CoE(s) — Confirmation of Enrolment', 'Documentos da Escola / Education Documents · CoE(s) do curso — junção de 2 anos de curso obrigatória', true, false);
  end if;

  -- --------------------------------------------------------------------
  -- checklist-couple.html → Subclass 485 — Couple (19 itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = 'Checklist Subclass 485 — Couple') then
    select id into v_service_type_id from public.service_types where nome = 'Subclass 485 — Couple';
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values ('Subclass 485 — Couple', 'Temporary Graduate Visa — Couple Application')
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, 'Checklist Subclass 485 — Couple')
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
      (v_template_id, 1, 'Passaporte Aplicante Principal', 'Documentos Pessoais / Personal Documents · Todas as páginas — inclusive as em branco, mesmo sem carimbo', true, false),
      (v_template_id, 2, 'Visto Atual Aplicante Principal', 'Documentos Pessoais / Personal Documents · Cópia do visto vigente de cada aplicante', true, false),
      (v_template_id, 3, 'AFP Police Check — Recibo de Solicitação Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 4, 'AFP Police Check — Resultado Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 5, 'Travel History Aplicante Principal', 'Documentos Pessoais / Personal Documents · PDF com todas as páginas do passaporte — incluindo as em branco', true, false),
      (v_template_id, 6, 'Comprovante de Endereço Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 7, 'OVHC — Overseas Visitor Health Cover (Couple)', 'Documentos Pessoais / Personal Documents · OSHC não é aceito — obrigatório OVHC Couple', true, false),
      (v_template_id, 8, 'Resultado IELTS ou PTE (PDF original) Aplicante Principal', 'Documentos Pessoais / Personal Documents · Score mínimo PTE: · Score mínimo IELTS: · Realizado nos últimos 12 meses — data limite do resultado adquirido é o dia anterior ao dia da aplicação', true, false),
      (v_template_id, 9, 'Endereços dos Últimos 10 Anos Aplicante Principal', 'Histórico / History · Sem gaps — mês e ano de entrada e saída de cada endereço', true, false),
      (v_template_id, 10, 'Viagens dos Últimos 10 Anos Aplicante Principal', 'Histórico / History', true, false),
      (v_template_id, 11, 'De Facto Declaration ou Marriage Certificate', 'Documentos do Relacionamento / Relationship Evidence · De Facto se união com mais de 12 meses — ou certidão de casamento', true, false),
      (v_template_id, 12, 'Lease Agreement', 'Documentos do Relacionamento / Relationship Evidence · Contrato de aluguel com nome de ambos', true, false),
      (v_template_id, 13, 'Conta Bancária Conjunta / Joint Bank Account', 'Documentos do Relacionamento / Relationship Evidence · Extrato comprovando conta conjunta', true, false),
      (v_template_id, 14, 'Skills Assessment — Solicitação / Application', 'Skills Assessment — Aplicante Principal', true, false),
      (v_template_id, 15, 'Skills Assessment — Aprovação / Approval Result', 'Skills Assessment — Aplicante Principal · Caso ainda não tenha iniciado e queira realizar seu processo com a KMP, nos avise, pois também oferecemos esse serviço.', true, false),
      (v_template_id, 16, 'Completion Letter', 'Documentos da Escola — Aplicante Principal', true, false),
      (v_template_id, 17, 'Academic Results', 'Documentos da Escola — Aplicante Principal', true, false),
      (v_template_id, 18, 'Certificate', 'Documentos da Escola — Aplicante Principal', true, false),
      (v_template_id, 19, 'CoE(s) — junção de 2 anos de curso obrigatória', 'Documentos da Escola — Aplicante Principal', true, false);
  end if;

  -- --------------------------------------------------------------------
  -- checklist-single-485-post-higher-education.html → Subclass 485 Post-Higher Education — Single (14 itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = 'Checklist Subclass 485 Post-Higher Education — Single') then
    select id into v_service_type_id from public.service_types where nome = 'Subclass 485 Post-Higher Education — Single';
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values ('Subclass 485 Post-Higher Education — Single', 'Temporary Graduate Visa (Post-Higher Education) — Single Application')
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, 'Checklist Subclass 485 Post-Higher Education — Single')
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
      (v_template_id, 1, 'Passaporte / Passport', 'Documentos Pessoais / Personal Documents · Todas as páginas — inclusive as em branco, mesmo sem carimbo', true, false),
      (v_template_id, 2, 'Visto Atual / Current Visa', 'Documentos Pessoais / Personal Documents · Cópia do visto vigente (VEVO: immi.homeaffairs.gov.au)', true, false),
      (v_template_id, 3, 'AFP Police Check — Recibo de Solicitação / Application Receipt', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 4, 'AFP Police Check — Resultado / Result', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 5, 'Travel History', 'Documentos Pessoais / Personal Documents · PDF com todas as páginas do passaporte — incluindo as em branco', true, false),
      (v_template_id, 6, 'Comprovante de Endereço / Proof of Address', 'Documentos Pessoais / Personal Documents · Conta de luz, gás, internet, extrato bancário ou lease agreement', true, false),
      (v_template_id, 7, 'OVHC — Overseas Visitor Health Cover (Single)', 'Documentos Pessoais / Personal Documents · Contrate e envie a apólice. Pago mensalmente por você diretamente. · OSHC não é aceito para o Subclass 485 — obrigatório OVHC', true, false),
      (v_template_id, 8, 'Resultado IELTS ou PTE (PDF original)', 'Documentos Pessoais / Personal Documents · Score mínimo PTE: · Score mínimo IELTS: · Realizado nos últimos 12 meses — data limite do resultado adquirido é o dia anterior ao dia da aplicação', true, false),
      (v_template_id, 9, 'Endereços dos Últimos 10 Anos / Address History', 'Histórico / History · Sem gaps entre as datas — mês e ano de entrada e saída de cada endereço', true, false),
      (v_template_id, 10, 'Viagens dos Últimos 10 Anos / Travel History', 'Histórico / History · País, motivo e datas (mês e ano) de todas as viagens fora da Austrália', true, false),
      (v_template_id, 11, 'Completion Letter', 'Documentos da Universidade / Education Documents · Carta de conclusão emitida pela universidade confirmando a finalização do curso', true, false),
      (v_template_id, 12, 'Academic Transcript (Transcripts Acadêmicos)', 'Documentos da Universidade / Education Documents · Histórico escolar completo com todas as unidades cursadas e resultados obtidos', true, false),
      (v_template_id, 13, 'Diploma / Degree Certificate', 'Documentos da Universidade / Education Documents · Certificado de conclusão do grau emitido pela universidade', true, false),
      (v_template_id, 14, 'CoE(s) — Confirmation of Enrolment', 'Documentos da Universidade / Education Documents · CoE(s) do curso completo — caso o curso tenha sido dividido em mais de um CoE, envie todos', true, false);
  end if;

  -- --------------------------------------------------------------------
  -- checklistcouple-485-post-higher-education.html → Subclass 485 Post-Higher Education — Couple (17 itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = 'Checklist Subclass 485 Post-Higher Education — Couple') then
    select id into v_service_type_id from public.service_types where nome = 'Subclass 485 Post-Higher Education — Couple';
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values ('Subclass 485 Post-Higher Education — Couple', 'Temporary Graduate Visa (Post-Higher Education) — Couple Application')
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, 'Checklist Subclass 485 Post-Higher Education — Couple')
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
      (v_template_id, 1, 'Passaporte Aplicante Principal', 'Documentos Pessoais / Personal Documents · Todas as páginas — inclusive as em branco, mesmo sem carimbo', true, false),
      (v_template_id, 2, 'Visto Atual Aplicante Principal', 'Documentos Pessoais / Personal Documents · Cópia do visto vigente de cada aplicante', true, false),
      (v_template_id, 3, 'AFP Police Check — Recibo de Solicitação Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 4, 'AFP Police Check — Resultado Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 5, 'Travel History Aplicante Principal', 'Documentos Pessoais / Personal Documents · PDF com todas as páginas do passaporte — incluindo as em branco', true, false),
      (v_template_id, 6, 'Comprovante de Endereço Aplicante Principal', 'Documentos Pessoais / Personal Documents', true, false),
      (v_template_id, 7, 'OVHC — Overseas Visitor Health Cover (Couple)', 'Documentos Pessoais / Personal Documents · OSHC não é aceito — obrigatório OVHC Couple', true, false),
      (v_template_id, 8, 'Resultado IELTS ou PTE (PDF original) Aplicante Principal', 'Documentos Pessoais / Personal Documents · Score mínimo PTE: · Score mínimo IELTS: · Realizado nos últimos 12 meses — data limite do resultado adquirido é o dia anterior ao dia da aplicação', true, false),
      (v_template_id, 9, 'Endereços dos Últimos 10 Anos Aplicante Principal', 'Histórico / History · Sem gaps — mês e ano de entrada e saída de cada endereço', true, false),
      (v_template_id, 10, 'Viagens dos Últimos 10 Anos Aplicante Principal', 'Histórico / History', true, false),
      (v_template_id, 11, 'De Facto Declaration ou Marriage Certificate', 'Documentos do Relacionamento / Relationship Evidence · De Facto se união com mais de 12 meses — ou certidão de casamento', true, false),
      (v_template_id, 12, 'Lease Agreement', 'Documentos do Relacionamento / Relationship Evidence · Contrato de aluguel com nome de ambos', true, false),
      (v_template_id, 13, 'Conta Bancária Conjunta / Joint Bank Account', 'Documentos do Relacionamento / Relationship Evidence · Extrato comprovando conta conjunta', true, false),
      (v_template_id, 14, 'Completion Letter', 'Documentos da Universidade — Aplicante Principal · Carta de conclusão emitida pela universidade confirmando a finalização do curso', true, false),
      (v_template_id, 15, 'Academic Transcript (Transcripts Acadêmicos)', 'Documentos da Universidade — Aplicante Principal · Histórico escolar completo com todas as unidades cursadas e resultados obtidos', true, false),
      (v_template_id, 16, 'Diploma / Degree Certificate', 'Documentos da Universidade — Aplicante Principal · Certificado de conclusão do grau emitido pela universidade', true, false),
      (v_template_id, 17, 'CoE(s) — Confirmation of Enrolment', 'Documentos da Universidade — Aplicante Principal · CoE(s) do curso completo — caso o curso tenha sido dividido em mais de um CoE, envie todos', true, false);
  end if;

  -- --------------------------------------------------------------------
  -- checklist-482-subsequent.html → Subclass 482 — Subsequent Entrant (25 itens)
  -- --------------------------------------------------------------------
  if not exists (select 1 from public.checklist_templates where nome = 'Checklist Subclass 482 — Subsequent Entrant') then
    select id into v_service_type_id from public.service_types where nome = 'Subclass 482 — Subsequent Entrant';
    if v_service_type_id is null then
      insert into public.service_types (nome, descricao)
      values ('Subclass 482 — Subsequent Entrant', 'Skills in Demand / TSS — Subsequent Entrant (parceiro/família)')
      returning id into v_service_type_id;
    end if;

    insert into public.checklist_templates (service_type_id, nome)
    values (v_service_type_id, 'Checklist Subclass 482 — Subsequent Entrant')
    returning id into v_template_id;

    update public.service_types
    set checklist_template_id = v_template_id
    where id = v_service_type_id;

    insert into public.checklist_template_items
      (checklist_template_id, ordem, nome, descricao, obrigatorio, condicional)
    values
      (v_template_id, 1, 'Passaporte — página de dados biográficos', 'Identidade e Passaporte · Cópia colorida nítida. Passaporte deve ter validade mínima de 6 meses.', true, false),
      (v_template_id, 2, 'Passaporte — todas as páginas carimbadas', 'Identidade e Passaporte · Inclui vistos, carimbos de entrada e saída de todos os países visitados.', true, false),
      (v_template_id, 3, 'Foto facial recente (fundo branco)', 'Identidade e Passaporte · Foto tipo passaporte, fundo branco, rostovisível. Arquivo JPG ou PNG.', true, false),
      (v_template_id, 4, 'Documento de identidade nacional (RG, CNH ou equivalente)', 'Identidade e Passaporte · Frente e verso. Inclui documentos australianos se o solicitante já reside aqui.', false, false),
      (v_template_id, 5, 'Certidão de união estável (de facto) ou certidão de casamento', 'Evidência de Relacionamento · Documento oficial registrado em cartório ou órgão competente. Tradução juramentada se em outro idioma.', true, false),
      (v_template_id, 6, 'Contrato de aluguel ou comprovante de residência conjunta', 'Evidência de Relacionamento · Contrato com ambos os nomes. Período atual.', true, false),
      (v_template_id, 7, 'Extrato bancário de conta conjunta ou transferências entre o casal', 'Evidência de Relacionamento · Últimos 3 a 6 meses. Demonstra vida financeira compartilhada.', true, false),
      (v_template_id, 8, 'Apólice de seguro conjunto (carro, saúde, residência)', 'Evidência de Relacionamento · Seguro com ambos os nomes ou como beneficiários mútuos.', false, true),
      (v_template_id, 9, 'Contas de consumo conjuntas (luz, internet, água, gás)', 'Evidência de Relacionamento · Conta emitida para o endereço compartilhado. Pelo menos 1 conta com um dos nomes.', false, true),
      (v_template_id, 10, 'Fotos do casal (viagens, eventos, vida cotidiana)', 'Evidência de Relacionamento · Selecione fotos com datas e locais diferentes para demonstrar convivência ao longo do tempo.', false, false),
      (v_template_id, 11, 'Declarações de terceiros (familiares, amigos, colegas)', 'Evidência de Relacionamento · Declarações de pessoas que conhecem o casal e confirmam o relacionamento.', false, false),
      (v_template_id, 12, 'Histórico de comunicações (mensagens, ligações, e-mails)', 'Evidência de Relacionamento · Especialmente útil se os parceiros ficaram em países diferentes por algum período.', false, false),
      (v_template_id, 13, 'Certidão de antecedentes criminais — Austrália (AFP National Police Check)', 'Antecedentes Criminais (Police Clearance) · Obrigatória para quem residiu na Austrália por 12+ meses (cumulativos) nos últimos 10 anos.', true, false),
      (v_template_id, 14, 'Certidão de antecedentes — Brasil (Polícia Federal — nível federal)', 'Antecedentes Criminais (Police Clearance) · Emitida pela Polícia Federal do Brasil. Obrigatória para nacionais brasileiros que viveram no Brasil por 12+ meses nos últimos 10 anos.', true, false),
      (v_template_id, 15, 'Certidão de antecedentes — estado brasileiro de residência (ex: RS, SP, RJ)', 'Antecedentes Criminais (Police Clearance) · Exigida pelo Department juntamente com a certidão federal. Solicitar no estado de residência mais recente.', true, false),
      (v_template_id, 16, 'Certidão de antecedentes de outros países (se aplicável)', 'Antecedentes Criminais (Police Clearance) · Necessária para cada país onde o solicitante residiu por 12+ meses (cumulativos) nos últimos 10 anos.', false, true),
      (v_template_id, 17, 'Resultado do exame de saúde (HAP ID)', 'Exame de Saúde · Agendado através do ImmiAccount. O Department enviará convite para exame após lodgement. Guarde o HAP ID.', false, true),
      (v_template_id, 18, 'Radiografia de tórax (chest x-ray) — se solicitado', 'Exame de Saúde · Solicitada pelo médico designado (panel physician) durante o exame.', false, true),
      (v_template_id, 19, 'Número de concessão do visto australiano anterior (Grant Number)', 'Visto Australiano Anterior (se aplicável) · Localizado no e-mail de grant ou no ImmiAccount. Ex: 0079553171553.', false, true),
      (v_template_id, 20, 'Cartão ou carta de concessão do visto anterior', 'Visto Australiano Anterior (se aplicável) · Se disponível, anexe a carta ou cartão de concessão do visto anterior.', false, false),
      (v_template_id, 21, 'Comprovante de endereço atual na Austrália', 'Comprovante de Residência · Conta de serviço, contrato de aluguel, correspondência bancária ou governamental com nome e endereço.', true, false),
      (v_template_id, 22, 'Tradução juramentada (NAATI) de todos os documentos em português', 'Documentos de Suporte Adicionais · Obrigatório para documentos em idioma que não seja inglês. Tradutor deve ter credencial NAATI.', true, false),
      (v_template_id, 23, 'Certidão de nascimento (para filhos dependentes menores de 18 anos)', 'Documentos de Suporte Adicionais · Com tradução juramentada NAATI se em português.', false, true),
      (v_template_id, 24, 'Certidão de adoção (se aplicável)', 'Documentos de Suporte Adicionais · Com tradução juramentada NAATI se em português.', false, true),
      (v_template_id, 25, 'Confirmação de seguro saúde (OSHC ou equivalente)', 'Documentos de Suporte Adicionais · O solicitante deve comprovar que fez arranjos adequados para seguro durante a estadia.', true, false);
  end if;
end $$;
