begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into cards (id, user_id, front, back) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'A', 'a'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'B', 'b');

-- Cartão 1: novo, avaliado "Errei"; cartão 2: novo, avaliado "Bom" e agendado para amanhã
select record_review('30000000-0000-0000-0000-000000000001', 1::smallint,
  jsonb_build_object('due', now(), 'stability', 0.4, 'difficulty', 7, 'elapsed_days', 0,
    'scheduled_days', 0, 'learning_steps', 0, 'reps', 1, 'lapses', 0, 'state', 1, 'last_review', now()));
select record_review('30000000-0000-0000-0000-000000000002', 3::smallint,
  jsonb_build_object('due', now() + interval '1 day', 'stability', 2.3, 'difficulty', 5, 'elapsed_days', 0,
    'scheduled_days', 1, 'learning_steps', 0, 'reps', 1, 'lapses', 0, 'state', 2, 'last_review', now()));

select is((select count(*)::int from review_stats(30, 'UTC')), 30, 'review_stats devolve 30 dias');
select results_eq(
  $$select reviews, correct from review_stats(30, 'UTC') order by day desc limit 1$$,
  $$values (2, 1)$$, 'hoje: 2 revisões, 1 correta');
select is(new_cards_studied_today('UTC'), 2, 'dois cartões novos estudados hoje');
select is((select count(*)::int from due_forecast(14, 'UTC')), 14, 'due_forecast devolve 14 dias');
select is((select sum(due_count)::int from due_forecast(14, 'UTC')), 2, 'os dois cartões aparecem na previsão');

select * from finish();
rollback;
