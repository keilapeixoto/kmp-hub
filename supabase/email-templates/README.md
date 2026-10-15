# Modelos de e-mail do Supabase Auth

Colados à mão no painel do Supabase (Authentication → Emails → Templates);
o Supabase não lê estes arquivos. Guardados aqui para versionar o texto.

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| Magic Link | Seu link de acesso ao portal KMP | `magic-link.html` |
| Invite user | Seu acesso ao portal KMP | `invite.html` (o texto muda sozinho: com `role` = equipe, sem = cliente) |

O convite (`Invite user`) é usado tanto para clientes (portal) quanto para a
equipe, por isso o texto é neutro. Remetente: SMTP próprio pelo Resend
(Authentication → Emails → SMTP Settings), não o padrão do Supabase, que tem
limite de poucos e-mails por hora.
