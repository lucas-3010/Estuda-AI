# Estuda-AI — Especificação de design

Data: 2026-10-21 · Autor do pedido: Lucas (lucas-3010)

## 1. Objetivo

Um site de estudos para programação em que a pessoa digita um tema, uma IA monta um
plano de estudos em etapas com flashcards, e um algoritmo de repetição espaçada (FSRS)
decide quando cada cartão deve ser revisado.

O projeto tem dois usos ao mesmo tempo:

- **Uso real no dia a dia** pelo Lucas (dados persistentes, acessível de qualquer aparelho).
- **Portfólio público no GitHub** (código organizado, testado, com README explicando a arquitetura).

### Critérios de sucesso

- Do tema digitado até a primeira revisão em menos de 2 minutos.
- O progresso nunca se perde (fica no Postgres, não no navegador).
- Qualquer visitante consegue criar conta e usar o site com a própria chave da Anthropic.
- Nenhuma chave de API é gravada no banco ou em logs.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Público | Uso pessoal real + portfólio público |
| Front-end | Next.js (App Router) + TypeScript + Tailwind CSS |
| Hospedagem | Vercel (plano gratuito) |
| Banco e login | Supabase (Postgres + Auth com GitHub e e-mail) |
| Conteúdo | Sem decks prontos; a IA gera plano + cartões a partir de um tema |
| IA | API do Claude (Anthropic), modelo `claude-opus-5-5`, SDK `@anthropic-ai/sdk` |
| Custo da IA | Cada usuário usa a própria chave da Anthropic (BYOK) |
| Repetição espaçada | FSRS pela biblioteca `ts-fsrs` |
| Repositório | `lucas-3010/estuda-ai` (público) |

## 3. Escopo da primeira versão

### Telas

1. **Login**: GitHub OAuth ou link mágico por e-mail (Supabase Auth). Páginas internas exigem sessão.
2. **Configurações**: campo para colar a chave da Anthropic. A chave fica em `localStorage`
   do navegador, mascarada na tela, com botão de remover. Um botão "Testar chave" faz uma
   chamada mínima e mostra se funciona.
3. **Novo tema** (`/novo`):
   - Campos: tema (texto livre, 3 a 200 caracteres), nível (iniciante, intermediário, avançado)
     e um campo opcional de contexto ("já sei X", "foco em Y").
   - A IA devolve um plano com 4 a 8 etapas; cada etapa tem título, objetivo e 5 a 10 cartões.
   - Tela de prévia: editar ou apagar qualquer cartão ou etapa, regenerar uma etapa
     individualmente, e só então salvar. Nada é gravado antes de "Salvar plano".
   - Sem chave configurada, a página explica e leva às Configurações.
4. **Início** (`/`): número de cartões vencidos hoje, botão "Revisar agora", lista de planos com
   progresso por etapa (cartões novos / aprendendo / revisados).
5. **Revisão** (`/revisar`, opcionalmente filtrada por plano):
   - Mostra a frente; espaço vira o cartão; o usuário avalia com Errei / Difícil / Bom / Fácil
     (teclas 1 a 4). Cada botão mostra o próximo intervalo previsto.
   - Fila: cartões vencidos primeiro (mais atrasados antes), depois até 20 cartões novos por dia
     (limite configurável).
   - Ao terminar a fila, tela de conclusão com resumo da sessão.
6. **Cartões** (`/cartoes`): listar, buscar por texto, filtrar por plano/etapa, criar, editar e
   apagar cartões manualmente.
7. **Estatísticas** (`/estatisticas`): revisões por dia (últimos 30 dias), taxa de acerto
   (notas diferentes de "Errei"), previsão de cartões vencendo nos próximos 14 dias.

### Conteúdo dos cartões

- Frente e verso em Markdown, com blocos de código com realce de sintaxe.
- HTML do Markdown é sanitizado antes de renderizar.

### Fora do escopo (v1)

App móvel nativo, compartilhar decks entre usuários, importar/exportar Anki, áudio ou imagens
nos cartões, modo offline, chave da IA paga pelo dono do site.

## 4. Arquitetura

```
Navegador (Next.js client)
  ├─ Supabase JS (sessão + CRUD direto nas tabelas, protegido por RLS)
  ├─ ts-fsrs (calcula o próximo agendamento no cliente)
  └─ POST /api/generate  ──►  Route Handler (Node, Vercel)
                                 └─ Anthropic SDK com a chave enviada no header
Supabase
  ├─ Auth
  └─ Postgres (tabelas + RLS + funções para estatísticas)
```

- **Leituras e escritas** de planos, cartões e revisões vão direto do cliente ao Supabase; a
  segurança é garantida por RLS no banco, não pelo front-end.
- **Registro de revisão** é uma função Postgres (`record_review`) chamada via RPC, que grava o
  log e atualiza o estado do cartão numa única transação.
- **Geração por IA** passa por uma rota do servidor para validar a entrada, aplicar o schema de
  saída e não expor detalhes da chamada no navegador.

### Organização do código

```
src/
  app/                  rotas e páginas (App Router)
  app/api/generate/     rota de geração por IA
  components/           componentes de UI
  lib/supabase/         clientes Supabase (browser e server)
  lib/srs/              adaptador do ts-fsrs (estado do cartão <-> FSRS)
  lib/ai/               prompt, schema do plano e chamada ao Claude
  lib/validation/       schemas zod compartilhados
supabase/migrations/    migrações SQL versionadas
tests/                  testes unitários e de integração
e2e/                    testes Playwright
```

## 5. Modelo de dados

Todas as tabelas têm `user_id uuid references auth.users not null` e RLS ativa com políticas
`user_id = auth.uid()` para select, insert, update e delete.

**study_plans**: `id`, `user_id`, `topic text`, `level text check (level in ('iniciante','intermediario','avancado'))`, `context text null`, `created_at`.

**plan_steps**: `id`, `user_id`, `plan_id → study_plans on delete cascade`, `position int`,
`title text`, `goal text`. Único por `(plan_id, position)`.

**cards**: `id`, `user_id`, `step_id → plan_steps on delete set null` (nulo para cartões avulsos),
`front text`, `back text`, `created_at`, `updated_at`, e o estado FSRS:
`due timestamptz`, `stability float8`, `difficulty float8`, `elapsed_days int`,
`scheduled_days int`, `reps int`, `lapses int`, `state smallint` (0 novo, 1 aprendendo,
2 revisão, 3 reaprendendo), `last_review timestamptz null`.
Índice em `(user_id, due)`.

**review_logs**: `id`, `user_id`, `card_id → cards on delete cascade`,
`rating smallint check (rating between 1 and 4)`, `state smallint`, `due timestamptz`,
`stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reviewed_at timestamptz default now()`.
Índice em `(user_id, reviewed_at)`.

**user_settings**: `user_id` (pk), `new_cards_per_day int default 20`, `desired_retention float8 default 0.9`.

**Funções**
- `record_review(p_card_id uuid, p_rating smallint, p_next jsonb)`, onde `p_next` traz o novo
  estado FSRS calculado no cliente (`due`, `stability`, `difficulty`, `elapsed_days`,
  `scheduled_days`, `reps`, `lapses`, `state`, `last_review`): verifica que o cartão pertence a `auth.uid()`,
  insere o log e atualiza o cartão na mesma transação.
- `review_stats(days int)` e `due_forecast(days int)`: agregações usadas na página de estatísticas.

## 6. Geração por IA

- O cliente envia `POST /api/generate` com `{ topic, level, context?, mode: 'plan' | 'step', step? }`
  e a chave no header `x-anthropic-key`. A rota também exige uma sessão Supabase válida.
- A rota valida a entrada com zod, chama `claude-opus-5-5` com saída estruturada
  (`output_config.format` com JSON Schema do plano) e valida a resposta de novo com zod antes de
  devolver.
- O prompt pede, em português do Brasil: cartões atômicos (uma ideia por cartão), frente em
  forma de pergunta, verso curto, exemplos de código quando ajudarem, progressão do básico ao
  avançado entre as etapas.
- A chave nunca é gravada, nunca vai para logs e não é repassada a nenhum outro serviço.
- Limites: tema até 200 caracteres, contexto até 1000; no máximo 8 etapas × 10 cartões.

### Erros

| Situação | O que o usuário vê |
|---|---|
| Sem chave | Aviso com link para Configurações |
| 401 da Anthropic | "Sua chave foi recusada. Confira em Configurações." |
| 429 / sem crédito | "Limite ou crédito da sua conta Anthropic atingido." |
| Recusa do modelo | "A IA não gerou conteúdo para este tema. Tente reformular." |
| JSON inválido / resposta cortada | Uma nova tentativa automática; se falhar, erro com botão "Tentar de novo" |
| Erro de rede | Mensagem com "Tentar de novo"; o formulário mantém o que foi digitado |

## 7. Repetição espaçada

- `ts-fsrs` com `request_retention` vindo de `user_settings.desired_retention` (padrão 0,9).
- O adaptador em `lib/srs/` converte entre a linha da tabela `cards` e o objeto `Card` do
  ts-fsrs, de forma pura e testável.
- Cartões novos começam com `state = 0` e `due = now()`.

## 8. Testes e qualidade

- **Unitários (Vitest)**: adaptador FSRS (ida e volta do estado, cada nota avança corretamente),
  montagem da fila do dia, schemas zod do plano, mapeamento de erros da IA.
- **Banco**: testes das políticas RLS (um usuário não lê nem altera dados de outro) e da função
  `record_review`, rodando contra o Supabase local.
- **Ponta a ponta (Playwright)**: login de teste → gerar plano (IA simulada) → salvar → revisar
  um cartão → ver o cartão reagendado.
- **CI (GitHub Actions)**: lint, typecheck e testes unitários a cada push e pull request.
- **README**: descrição, prints, diagrama da arquitetura, como rodar localmente e decisões técnicas.

## 9. Critérios de aceitação

1. Um usuário novo entra com GitHub ou e-mail e cai na página Início.
2. Sem chave configurada, a página Novo tema leva às Configurações; com chave, gera um plano de
   4 a 8 etapas com 5 a 10 cartões cada.
3. Na prévia é possível editar, apagar e regenerar uma etapa; nada é salvo antes de "Salvar plano".
4. Após salvar, os cartões novos aparecem na fila de revisão do dia, respeitando o limite diário.
5. Avaliar um cartão grava um `review_logs` e atualiza `due` do cartão conforme o FSRS, numa
   única transação.
6. Um usuário não consegue ler, alterar ou apagar dados de outro usuário (verificado por teste de RLS).
7. A chave da Anthropic não aparece em nenhuma tabela nem em logs do servidor.
8. A página Estatísticas mostra revisões dos últimos 30 dias, taxa de acerto e previsão de 14 dias.
9. Os erros da tabela da seção 6 mostram as mensagens descritas.
10. A CI passa (lint, typecheck, testes) na branch principal, e o README explica como rodar o projeto.
