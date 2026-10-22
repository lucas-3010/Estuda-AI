begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'g@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b8', 'h@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';

select lives_ok($$insert into practice_exams (title, questions) values ('Vunesp 2022',
  '[{"number":1,"statement":"Q1","options":["a","b","c","d","e"],"answer":2,"fromKey":true}]')$$,
  'dono salva uma prova');
select throws_ok($$insert into practice_exams (title, questions) values ('Vazia', '[]')$$,
  '23514', null, 'prova sem questões é recusada');
select throws_ok($$insert into practice_exams (title, questions) values ('Objeto', '{"a":1}')$$,
  '23514', null, 'questões precisam ser uma lista');
select is((select count(*)::int from practice_exams), 1, 'dono vê a própria prova');

-- Outra pessoa não vê nem apaga a prova
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}';
select is((select count(*)::int from practice_exams), 0, 'outra pessoa não vê a prova');
delete from practice_exams;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';
select is((select count(*)::int from practice_exams), 1, 'outra pessoa não apaga a prova');

-- Importar conta na cota de gerações
reset role;
select lives_ok($$insert into ai_usage (user_id, kind) values ('00000000-0000-0000-0000-0000000000a7', 'import')$$,
  'importação é um tipo de geração aceito');

select * from finish();
rollback;
