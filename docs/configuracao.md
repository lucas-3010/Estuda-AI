# Configuração para produção

Passo a passo para colocar no ar a versão com planos pagos. Faça tudo primeiro no **modo de teste** do Stripe.

## 1. Banco (Supabase)

1. Aplique a migração nova: `npx supabase link --project-ref eerriupvtvlwhiznblbm` e `npx supabase db push`.
2. Em **Project Settings → API Keys**, copie a **secret key** (ou `service_role`). Ela vai na Vercel como
   `SUPABASE_SECRET_KEY`. Nunca coloque essa chave no navegador nem em variáveis `NEXT_PUBLIC_`.

## 2. Anthropic (IA)

1. Em [console.anthropic.com](https://console.anthropic.com/settings/keys), crie uma chave só para o site e salve
   como `ANTHROPIC_API_KEY` na Vercel.
2. Em **Settings → Limits**, defina um **limite de gasto mensal** (comece com US$ 20). Se o limite for atingido, o
   site mostra "geração indisponível" e não cobra a cota de ninguém.

## 3. Stripe (pagamentos)

1. Crie a conta em [dashboard.stripe.com](https://dashboard.stripe.com) e deixe o botão **Modo de teste** ligado.
2. **Produtos**: em *Catálogo de produtos → Adicionar produto*, crie três produtos com preço **recorrente mensal em
   BRL**: Básico R$ 17,90, Pro R$ 24,90 e Max R$ 39,90. Copie o ID de cada preço (`price_...`) para
   `STRIPE_PRICE_BASICO`, `STRIPE_PRICE_PRO` e `STRIPE_PRICE_MAX`.
3. **Chave**: em *Desenvolvedores → Chaves de API*, copie a chave secreta (`sk_test_...`) para `STRIPE_SECRET_KEY`.
4. **Webhook**: em *Desenvolvedores → Webhooks → Adicionar endpoint*, use
   `https://estuda-ai-s5we.vercel.app/api/stripe/webhook` e marque os eventos `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`. Copie o
   *signing secret* (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.
5. **Portal do cliente**: em *Configurações → Billing → Portal do cliente*, ative cancelamento e troca de plano
   (adicione os três produtos). É por ele que o assinante cancela ou troca de plano.
6. **Testar**: assine no site com o cartão `4242 4242 4242 4242`, qualquer data futura e qualquer CVC. Confira em
   *Webhooks* se os eventos chegaram com status 200 e se o plano mudou em **Configurações** no site.
7. **Ir para produção**: ative a conta (dados da empresa/CPF e conta bancária), desligue o modo de teste, refaça os
   passos 2 a 5 com as chaves `sk_live_...` e troque as variáveis na Vercel.

Taxas usadas no cálculo de preço: 3,99% + R$ 0,39 por cobrança de cartão nacional.

## 4. Login com Google

- **Google**: no [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um *ID do cliente
  OAuth* (aplicativo da Web) com o URI de redirecionamento `https://eerriupvtvlwhiznblbm.supabase.co/auth/v1/callback`.
  Cole o ID e o segredo em Supabase → **Authentication → Providers → Google**.

## 5. E-mail de lembrete (Resend)

1. Crie a conta em [resend.com](https://resend.com), verifique um domínio seu e crie uma chave → `RESEND_API_KEY`.
2. `REMINDER_FROM`, por exemplo `Estuda-AI <lembretes@seudominio.com.br>`.
3. `CRON_SECRET`: uma senha longa aleatória. A Vercel a envia ao chamar `/api/cron/lembretes` todo dia às 8h
   (horário de Brasília). Só assinantes com lembrete ligado recebem.

## 6. Variáveis na Vercel

| Variável | De onde vem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | já configuradas |
| `SUPABASE_SECRET_KEY` | passo 1 |
| `ANTHROPIC_API_KEY` | passo 2 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASICO`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX` | passo 3 |
| `NEXT_PUBLIC_SITE_URL` | `https://estuda-ai-s5we.vercel.app` (ou o seu domínio) |
| `RESEND_API_KEY`, `REMINDER_FROM`, `CRON_SECRET` | passo 5 |

Antes de cobrar de verdade: mude a Vercel para o plano **Pro** (o Hobby proíbe uso comercial) e publique termos de
uso e política de privacidade (LGPD).

## Limitações

- **Vídeo** não é aceito: a API do Claude não lê vídeo. A alternativa é colar a transcrição (o YouTube mostra em
  "Mostrar transcrição") na aba de texto.
- PDFs até cerca de 3 MB e 100 páginas; fotos são reduzidas no navegador antes do envio.
