begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev');
insert into cards (id, user_id, front, back) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'A', 'a');

-- Revisões hoje, ontem e anteontem (sequência de 3) e uma sequência antiga de 4 dias
insert into review_logs (user_id, card_id, rating, state, due, stability, difficulty, elapsed_days, scheduled_days, reviewed_at)
select '00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 3, 2, now(), 1, 5, 0, 1,
       now() - make_interval(days => d)
from unnest(array[0, 0, 1, 2, 10, 11, 12, 13]) as d;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select current_streak from study_streak('UTC')), 3, 'sequência atual de 3 dias');
select is((select best_streak from study_streak('UTC')), 4, 'melhor sequência de 4 dias');
select is((select reviews_today from study_streak('UTC')), 2, 'duas revisões hoje');

select * from finish();
rollback;
