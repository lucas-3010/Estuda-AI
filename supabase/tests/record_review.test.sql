begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into cards (id, user_id, front, back)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Frente', 'Verso');

select is((select state::int from cards), 0, 'cartão novo começa no estado 0');

select lives_ok($$
  select record_review(
    '30000000-0000-0000-0000-000000000001', 3::smallint,
    '{"due":"2030-01-02T00:00:00Z","stability":2.3,"difficulty":5.1,"elapsed_days":0,
      "scheduled_days":1,"learning_steps":1,"reps":1,"lapses":0,"state":1,
      "last_review":"2030-01-01T00:00:00Z"}'::jsonb)
$$, 'A registra revisão no próprio cartão');

select is((select count(*)::int from review_logs), 1, 'um log foi gravado');
select is((select due from cards), '2030-01-02T00:00:00Z'::timestamptz, 'due do cartão foi atualizado');

select throws_ok($$
  select record_review('30000000-0000-0000-0000-000000000001', 5::smallint,
    '{"due":"2030-01-02T00:00:00Z","stability":1,"difficulty":1,"elapsed_days":0,
      "scheduled_days":1,"learning_steps":0,"reps":2,"lapses":0,"state":2,
      "last_review":"2030-01-01T00:00:00Z"}'::jsonb)
$$, '23514', null, 'nota 5 é rejeitada');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select throws_ok($$
  select record_review('30000000-0000-0000-0000-000000000001', 3::smallint,
    '{"due":"2031-01-01T00:00:00Z","stability":1,"difficulty":1,"elapsed_days":0,
      "scheduled_days":1,"learning_steps":0,"reps":2,"lapses":0,"state":2,
      "last_review":"2030-01-01T00:00:00Z"}'::jsonb)
$$, 'P0002', null, 'B não registra revisão no cartão de A');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from review_logs), 1, 'tentativas inválidas não gravaram logs');

select * from finish();
rollback;
