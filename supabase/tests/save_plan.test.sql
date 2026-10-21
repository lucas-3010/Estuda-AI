begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select isnt(
  save_plan('SQL', 'iniciante', null, '[
    {"title":"Básico","goal":"g1","cards":[{"front":"a1","back":"b"},{"front":"a2","back":"b"}]},
    {"title":"Avançado","goal":"g2","cards":[{"front":"z1","back":"b"}]}
  ]'::jsonb),
  null, 'save_plan devolve o id do plano');

select is((select count(*)::int from study_plans), 1, 'um plano criado');
select is((select count(*)::int from plan_steps), 2, 'duas etapas criadas');
select is((select count(*)::int from cards where state = 0), 3, 'três cartões novos criados');
select results_eq(
  $$select front from cards order by due, id$$,
  $$values ('a1'), ('a2'), ('z1')$$,
  'cartões novos seguem a ordem do plano');

select throws_ok(
  $$select save_plan('SQL', 'iniciante', null, '[{"title":"X","goal":"g","cards":[{"front":"","back":"b"}]}]'::jsonb)$$,
  '23514', null, 'cartão inválido aborta tudo');
select is((select count(*)::int from study_plans), 1, 'falha não deixa plano vazio');

select * from finish();
rollback;
