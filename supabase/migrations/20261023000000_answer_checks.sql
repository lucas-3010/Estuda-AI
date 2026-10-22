-- Correções pela IA das respostas digitadas na revisão.
-- Têm limite diário próprio, separado da cota mensal de gerações.

create table public.answer_checks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index answer_checks_user_created_idx on public.answer_checks (user_id, created_at);

-- Só o servidor (service_role) lê e escreve.
alter table public.answer_checks enable row level security;
revoke all on public.answer_checks from anon, authenticated;

-- Reserva uma correção antes de chamar a IA. O dia é contado no horário de Brasília.
-- Falha com 'quota_exceeded' quando o limite do dia acabou e com 'rate_limited'
-- com mais de 20 correções no último minuto.
create function public.claim_answer_check(p_user uuid, p_limit int)
returns table (check_id bigint, used int)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_recent int;
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('answer_checks:' || p_user::text));

  select count(*)::int into v_used
  from public.answer_checks
  where user_id = p_user
    and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

  if v_used >= p_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  select count(*)::int into v_recent
  from public.answer_checks
  where user_id = p_user and created_at > now() - interval '1 minute';

  if v_recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.answer_checks (user_id) values (p_user) returning id into v_id;
  return query select v_id, v_used + 1;
end;
$$;

-- Devolve a correção quando a chamada à IA falha.
create function public.refund_answer_check(p_check_id bigint)
returns void
language sql security definer set search_path = '' as $$
  delete from public.answer_checks where id = p_check_id
$$;

revoke execute on function public.claim_answer_check(uuid, int) from public, anon, authenticated;
revoke execute on function public.refund_answer_check(bigint) from public, anon, authenticated;
grant execute on function public.claim_answer_check(uuid, int) to service_role;
grant execute on function public.refund_answer_check(bigint) to service_role;
