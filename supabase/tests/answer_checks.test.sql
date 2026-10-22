begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c3', 'c@teste.dev'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@teste.dev');

-- Limite diário e por minuto (chamadas do servidor, como service_role)
set local role service_role;

select is((select used from claim_answer_check('00000000-0000-0000-0000-0000000000c3', 2)), 1,
  'primeira correção do dia');
select is((select used from claim_answer_check('00000000-0000-0000-0000-0000000000c3', 2)), 2,
  'segunda correção do dia');
select throws_ok($$select claim_answer_check('00000000-0000-0000-0000-0000000000c3', 2)$$,
  'P0001', 'quota_exceeded', 'terceira correção passa do limite do dia');

select refund_answer_check((select max(id) from answer_checks));
select is((select count(*)::int from answer_checks where user_id = '00000000-0000-0000-0000-0000000000c3'), 1,
  'reembolso devolve a correção');

select claim_answer_check('00000000-0000-0000-0000-0000000000d4', 100) from generate_series(1, 20);
select throws_ok($$select claim_answer_check('00000000-0000-0000-0000-0000000000d4', 100)$$,
  'P0001', 'rate_limited', 'mais de 20 correções por minuto é bloqueado');

-- O usuário não reserva correções nem lê a tabela
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';

select throws_ok($$select claim_answer_check('00000000-0000-0000-0000-0000000000c3', 999)$$,
  '42501', null, 'usuário não chama claim_answer_check');
select throws_ok($$select count(*) from answer_checks$$, '42501', null, 'usuário não lê answer_checks');

select * from finish();
rollback;
