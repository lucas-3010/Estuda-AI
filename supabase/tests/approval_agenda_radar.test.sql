begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'i@teste.dev'),
  ('00000000-0000-0000-0000-0000000000c2', 'j@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

-- Chance de aprovação: nota de corte no plano
select save_plan('TJ 2026', 'intermediario', null, '[{"title":"E1","goal":"G","cards":[{"front":"P1","back":"R1"},{"front":"P2","back":"R2"}]}]'::jsonb);
update study_plans set cutoff = 72.5, cutoff_note = 'Informada por você';
select is((select cutoff from study_plans), 72.50::numeric(5,2), 'grava a nota de corte');
select throws_ok($$update study_plans set cutoff = 120$$, '23514', null, 'nota de corte vai de 0 a 100');

-- Agenda: minutos por dia da semana
update user_settings set study_minutes = '{0,120,120,90,120,60,0}';
select is((select study_minutes from user_settings), '{0,120,120,90,120,60,0}'::smallint[], 'grava a agenda');
select throws_ok($$update user_settings set study_minutes = '{60,60}'$$, '23514', null, 'agenda tem 7 dias');

-- "Tenho certeza?"
select record_review((select id from cards where front = 'P1'), 3::smallint,
  '{"due":"2026-11-01T00:00:00Z","stability":3,"difficulty":5,"elapsed_days":0,"scheduled_days":3,"learning_steps":0,"reps":1,"lapses":0,"state":2,"last_review":"2026-10-22T00:00:00Z"}', true);
select record_review((select id from cards where front = 'P2'), 1::smallint,
  '{"due":"2026-10-22T00:10:00Z","stability":1,"difficulty":6,"elapsed_days":0,"scheduled_days":0,"learning_steps":1,"reps":1,"lapses":0,"state":1,"last_review":"2026-10-22T00:00:00Z"}', false);
select record_review((select id from cards where front = 'P2'), 3::smallint,
  '{"due":"2026-10-25T00:00:00Z","stability":2,"difficulty":6,"elapsed_days":0,"scheduled_days":3,"learning_steps":0,"reps":2,"lapses":0,"state":2,"last_review":"2026-10-22T00:10:00Z"}');
select results_eq('select * from confidence_stats(30)', $$values (1, 1, 1, 0)$$, 'calibração conta certezas e chutes');
select is((select count(*)::int from review_logs where confident is null), 1, 'revisão sem marcação fica nula');

-- Radar de editais: até 3 por pessoa, só o servidor marca o edital encontrado
insert into edital_watches (query) values ('Polícia Federal'), ('TJ-RJ Analista'), ('INSS');
select throws_ok($$insert into edital_watches (query) values ('Receita')$$, 'P0001', 'watch_limit', 'no máximo 3 buscas');
select throws_ok($$update edital_watches set found_at = now()$$, '42501', null, 'pessoa não marca edital encontrado');
update edital_watches set seen_at = now() where query = 'INSS';
select is((select count(*)::int from edital_watches where seen_at is not null), 1, 'pessoa dispensa o aviso');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from edital_watches), 0, 'RLS isola o radar');
select results_eq('select * from confidence_stats(30)', $$values (0, 0, 0, 0)$$, 'calibração é só da pessoa');

select * from finish();
rollback;
