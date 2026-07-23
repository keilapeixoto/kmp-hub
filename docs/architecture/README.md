# Arquitetura do KMP Hub — Índice

Esta pasta é a **referência técnica permanente** do projeto. Qualquer pessoa
ou IA que for trabalhar no KMP Hub deve ler estes documentos antes de propor
mudanças estruturais — eles descrevem *por que* o sistema é como é, não só
*o que* ele faz.

Este é um documento vivo. Se uma decisão documentada aqui mudar no código,
**atualize o documento no mesmo commit** — documentação desatualizada é pior
que nenhuma, porque engana com confiança.

## Como usar isto

- **Construindo uma feature nova?** Leia [10 — Guia de Desenvolvimento com
  IA](./10-ai-development-guide.md) primeiro — é o atalho para os outros nove.
- **Decidindo onde um arquivo novo vai?** [03 — Estrutura de
  Pastas](./03-folder-structure.md).
- **Criando uma tabela nova?** [04 — Arquitetura de
  Dados](./04-database-architecture.md) + [08 — Guia de
  Segurança](./08-security-guide.md) (RLS é obrigatória, sem exceção).
- **Construindo uma tela nova?** [05 — Design System](./05-design-system.md) +
  [06 — Arquitetura de Componentes](./06-component-architecture.md).
- **Decidindo se algo é Server Action, Route Handler ou Edge Function?** [07 —
  Padrões de API](./07-api-standards.md).
- **Avaliando se uma decisão vai travar o crescimento do produto?** [12 —
  Escalabilidade Futura](./12-future-scalability.md) + [13 — Riscos
  Arquiteturais](./13-architectural-risks.md).

## Índice

| # | Documento | Resumo em uma frase |
|---|-----------|---------------------|
| 1 | [Product Vision](./01-product-vision.md) | O que o KMP Hub é, pra quem, e o que **não** é. |
| 2 | [Software Architecture](./02-software-architecture.md) | Como as peças (Next.js, Supabase, Vercel) se encaixam e por quê. |
| 3 | [Folder Structure](./03-folder-structure.md) | Onde cada tipo de arquivo mora. |
| 4 | [Database Architecture](./04-database-architecture.md) | Todas as tabelas, relações e convenções do banco. |
| 5 | [Design System](./05-design-system.md) | Cores, tipografia, espaçamento, componentes visuais. |
| 6 | [Component Architecture](./06-component-architecture.md) | Como organizar, nomear e reutilizar componentes React. |
| 7 | [API Standards](./07-api-standards.md) | Server Actions vs. Route Handlers vs. Edge Functions — quando usar cada um. |
| 8 | [Security Guide](./08-security-guide.md) | Auth, RLS, Storage, logs — a maior fonte de risco do projeto. |
| 9 | [Coding Standards](./09-coding-standards.md) | TypeScript, nomenclatura, erros, validação, performance. |
| 10 | [AI Development Guide](./10-ai-development-guide.md) | Checklist prático pra qualquer IA continuar o projeto sem quebrar o padrão. |
| 11 | [Development Roadmap](./11-development-roadmap.md) | Ordem lógica de construção, da fundação ao avançado. |
| 12 | [Future Scalability](./12-future-scalability.md) | Caminho de crescimento até multi-tenant e dezenas de milhares de usuários. |
| 13 | [Architectural Risks](./13-architectural-risks.md) | Riscos identificados, decisões questionadas, alternativas propostas. |

## Contexto rápido (pra não abrir 13 arquivos só pra lembrar o nome do projeto)

- **Produto**: CRM operacional para consultorias de imigração, educação e
  intercâmbio. **A KMP Consulting é a primeira cliente e o ambiente de
  validação — não a dona do produto.** O sistema roda hoje **single-tenant**
  (uma empresa, sem cobrança) porque ainda não existe um segundo cliente,
  não porque o produto "é da KMP" — a visão é um SaaS multi-tenant
  independente, com marca/operação/banco/planos próprios. Ver
  [01 — Product Vision](./01-product-vision.md) para a distinção completa
  entre estado atual e estado futuro, e o documento 12 para o caminho de
  migração (planejado, não implementado).
- **Stack**: Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase
  (Postgres + Auth + Storage) · Vercel · GitHub. **shadcn/ui** é stack
  obrigatória daqui em diante — hoje o projeto usa Tailwind puro sem nenhum
  design system de componentes; ver [06](./06-component-architecture.md) para
  o plano de adoção incremental.
- **Estado atual**: ver `CLAUDE.md` na raiz do repo para o estado semana-a-semana
  do projeto (sprints concluídos, pendências, dados reais importados). Este
  `docs/architecture/` documenta a arquitetura **estável**; o `CLAUDE.md`
  documenta o **estado em movimento**. Não duplique informação entre os dois —
  se for sobre "como o sistema é estruturado", vai aqui; se for "o que foi
  feito essa semana", vai no `CLAUDE.md`.
