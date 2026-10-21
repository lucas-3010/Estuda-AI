begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

-- Usuários de teste
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@teste.dev');

-- Como A: cria plano, etapa e cartão
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into study_plans (id, user_id, topic, level)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'SQL joins', 'iniciante');
insert into plan_steps (id, user_id, plan_id, position, title, goal)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
        '10000000-0000-0000-0000-000000000001', 0, 'Inner join', 'Entender inner join');
insert into cards (id, user_id, step_id, front, back)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
        '20000000-0000-0000-0000-000000000001', 'O que é INNER JOIN?', 'Linhas com correspondência nas duas tabelas.');

select is((select count(*)::int from cards), 1, 'A vê o próprio cartão');
select is((select count(*)::int from user_settings), 1, 'A tem configurações criadas automaticamente');

-- Como B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is((select count(*)::int from study_plans), 0, 'B não vê planos de A');
select is((select count(*)::int from plan_steps), 0, 'B não vê etapas de A');
select is((select count(*)::int from cards), 0, 'B não vê cartões de A');

update cards set front = 'hackeado' where id = '30000000-0000-0000-0000-000000000001';
delete from study_plans where id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$insert into cards (user_id, front, back) values ('00000000-0000-0000-0000-0000000000a1', 'x', 'y')$$,
  '42501', null, 'B não insere cartão em nome de A'
);

-- Volta para A e confere que nada mudou
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select front from cards where id = '30000000-0000-0000-0000-000000000001'),
          'O que é INNER JOIN?', 'update de B não afetou o cartão de A');
select is((select count(*)::int from study_plans), 1, 'delete de B não apagou o plano de A');

-- Anônimo não vê nada
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from cards), 0, 'anônimo não vê cartões');
select is((select count(*)::int from review_logs), 0, 'anônimo não vê revisões');

select * from finish();
rollback;
