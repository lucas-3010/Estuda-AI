begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@teste.dev');

-- Cota e limite por minuto (chamadas do servidor, como service_role)
set local role service_role;

select is((select used from claim_generation('00000000-0000-0000-0000-0000000000a1', 'plan', 2)), 1,
  'primeira geração do mês');
select is((select used from claim_generation('00000000-0000-0000-0000-0000000000a1', 'plan', 2)), 2,
  'segunda geração do mês');
select throws_ok($$select claim_generation('00000000-0000-0000-0000-0000000000a1', 'plan', 2)$$,
  'P0001', 'quota_exceeded', 'terceira geração passa da cota');

select refund_generation((select max(id) from ai_usage));
select is((select count(*)::int from ai_usage where user_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'reembolso devolve a geração');

select claim_generation('00000000-0000-0000-0000-0000000000b2', 'plan', 100) from generate_series(1, 5);
select throws_ok($$select claim_generation('00000000-0000-0000-0000-0000000000b2', 'plan', 100)$$,
  'P0001', 'rate_limited', 'mais de 5 gerações por minuto é bloqueado');

insert into subscriptions (user_id, plan) values ('00000000-0000-0000-0000-0000000000a1', 'pro');
select is((select count(*)::int from reminder_candidates()), 1, 'só assinantes recebem lembrete');
select is((select generations_used from reminder_candidates()), 1, 'lembrete traz as gerações usadas');

-- O usuário não reserva gerações nem altera a assinatura por conta própria
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok($$select claim_generation('00000000-0000-0000-0000-0000000000a1', 'plan', 999)$$,
  '42501', null, 'usuário não chama claim_generation');
select throws_ok($$select reminder_candidates()$$, '42501', null, 'usuário não lê e-mails de outros');
select throws_ok($$update subscriptions set plan = 'max'$$, '42501', null, 'usuário não muda o próprio plano');
select is((select count(*)::int from ai_usage), 1, 'usuário vê só o próprio uso');

select * from finish();
rollback;
