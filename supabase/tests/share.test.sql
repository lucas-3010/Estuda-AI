begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e5', 'e@teste.dev'),
  ('00000000-0000-0000-0000-0000000000f6', 'f@teste.dev');

-- Dono cria um plano e o compartilha
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}';

select save_plan('Direito Constitucional', 'iniciante', 'meu contexto secreto',
  '[{"title":"Etapa 1","goal":"Objetivo 1","cards":[{"front":"P1","back":"R1"},{"front":"P2","back":"R2"}]}]'::jsonb);

select is(shared_plan('tokenquenaoexiste123'), null, 'plano sem link não aparece');

update study_plans set share_token = 'link_publico_1234567' where topic = 'Direito Constitucional';
select throws_ok($$update study_plans set share_token = 'curto' where topic = 'Direito Constitucional'$$,
  '23514', null, 'link curto demais é recusado');
update study_plans set exam_date = '2026-12-01' where topic = 'Direito Constitucional';
select is((select exam_date from study_plans where topic = 'Direito Constitucional'), '2026-12-01'::date,
  'dono grava a data da prova');

-- Visitante sem login lê o plano compartilhado, sem o contexto
set local role anon;
select is(shared_plan('link_publico_1234567') ->> 'topic', 'Direito Constitucional', 'visitante lê o tema');
select is(jsonb_array_length(shared_plan('link_publico_1234567') -> 'steps' -> 0 -> 'cards'), 2,
  'visitante lê os cartões');
select ok(shared_plan('link_publico_1234567')::text not like '%secreto%', 'contexto do dono não vaza');
select throws_ok($$select copy_shared_plan('link_publico_1234567')$$, '42501', null,
  'visitante sem login não copia');

-- Outra pessoa copia o plano e recebe cartões novos na própria conta
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f6","role":"authenticated"}';

select isnt(copy_shared_plan('link_publico_1234567'), null, 'cópia cria um plano');
select is((select count(*)::int from cards), 2, 'cópia traz os cartões');
select is((select count(*)::int from cards where state = 0), 2, 'cartões copiados começam como novos');
select throws_ok($$select copy_shared_plan('tokenquenaoexiste123')$$, 'P0001', 'not_found',
  'link inexistente');

-- Pontos fracos só olham as revisões da própria pessoa
select is((select count(*)::int from weak_steps(30)), 0, 'sem revisões, sem pontos fracos');

select * from finish();
rollback;
