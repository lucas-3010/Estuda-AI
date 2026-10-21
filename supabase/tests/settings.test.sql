begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(2);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@teste.dev');
-- Simula usuário sem linha de configurações
delete from user_settings where user_id = '00000000-0000-0000-0000-0000000000a1';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok($$
  insert into user_settings (user_id, new_cards_per_day, desired_retention)
  values ('00000000-0000-0000-0000-0000000000a1', 30, 0.85)
  on conflict (user_id) do update set new_cards_per_day = excluded.new_cards_per_day,
    desired_retention = excluded.desired_retention
$$, 'usuário sem linha consegue salvar configurações (upsert)');
select is((select new_cards_per_day from user_settings), 30, 'valor salvo');

select * from finish();
rollback;
