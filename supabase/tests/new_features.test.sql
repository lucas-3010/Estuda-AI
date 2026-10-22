begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'g@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b8', 'h@teste.dev');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';

-- Caderno de erros
select isnt(add_mistake(null, 'Questão 1', 'Resposta 1'), null, 'erro sem plano cria o caderno');
select add_mistake(null, 'Questão 1', 'Resposta 1');
select add_mistake(null, 'Questão 2', 'Resposta 2');
select is((select count(*)::int from study_plans where kind = 'mistakes'), 1, 'um só caderno de erros');
select is((select count(*)::int from cards where origin = 'mistake'), 2, 'questão repetida não duplica');

select save_plan('Biologia', 'iniciante', null,
  '[{"title":"E1","goal":"G1","cards":[{"front":"P","back":"R","origin":"law","law_ref":"Art. 5º"}]}]'::jsonb);
select is((select law_ref from cards where front = 'P'), 'Art. 5º', 'save_plan grava o artigo');
select add_mistake((select id from study_plans where topic = 'Biologia'), 'Q bio', 'R bio');
select is((select count(*)::int from plan_steps s join study_plans p on p.id = s.plan_id
  where p.topic = 'Biologia' and s.kind = 'mistakes'), 1, 'erro do simulado vai para Meus erros do plano');

-- Edital: só o servidor cria; a pessoa vira plano
reset role;
insert into editais (id, user_id, title, banca, disciplines) values
  ('00000000-0000-0000-0000-00000000ed01', '00000000-0000-0000-0000-0000000000a7', 'TJ 2026', 'FGV',
   '[{"name":"Português","weight":4,"topics":["Crase","Concordância"]},{"name":"Lógica","weight":2,"topics":["Proposições"]}]');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';

select throws_ok($$insert into editais (user_id, title, disciplines) values (auth.uid(), 'x', '[]')$$,
  '42501', null, 'pessoa não cria edital direto');
select throws_ok($$select create_edital_plan('00000000-0000-0000-0000-00000000ed01',
  '[{"name":"A","weight":1,"topics":[]},{"name":"B","weight":1,"topics":[]},{"name":"C","weight":1,"topics":[]}]', null)$$,
  'P0001', 'invalid_input', 'não aumenta a lista de disciplinas');
select isnt(create_edital_plan('00000000-0000-0000-0000-00000000ed01',
  '[{"name":"Português","weight":5,"topics":["Crase"]},{"name":"Lógica","weight":2,"topics":["Proposições"]}]', '2026-12-01'),
  null, 'edital vira plano');
select is((select count(*)::int from plan_steps s join study_plans p on p.id = s.plan_id where p.kind = 'edital'), 2,
  'uma etapa por disciplina');
select throws_ok($$select create_edital_plan('00000000-0000-0000-0000-00000000ed01', '[]', null)$$,
  'P0001', 'already_created', 'não cria duas vezes');

-- Reserva de disciplina (servidor)
reset role;
select is((select title from claim_edital_step('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ed01', 0)), 'TJ 2026', 'servidor reserva a disciplina');
select throws_ok($$select * from claim_edital_step('00000000-0000-0000-0000-0000000000a7',
  '00000000-0000-0000-0000-00000000ed01', 0)$$, 'P0001', 'already_generated', 'disciplina gera uma vez');
select throws_ok($$select * from claim_edital_step('00000000-0000-0000-0000-0000000000b8',
  '00000000-0000-0000-0000-00000000ed01', 1)$$, 'P0001', 'not_found', 'outra pessoa não usa o edital');

-- Outra pessoa não vê o caderno nem o edital
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}';
select is((select count(*)::int from editais) + (select count(*)::int from cards), 0, 'RLS isola os dados');

select * from finish();
rollback;
