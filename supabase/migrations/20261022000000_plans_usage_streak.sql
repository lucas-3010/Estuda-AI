-- Estuda-AI: assinaturas, cota de gerações de IA, meta diária, sequência e lembretes.

-- Assinatura de cada usuário. Sem linha = plano grátis.
-- Só o servidor (service_role, webhook do Stripe) escreve aqui.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'gratis' check (plan in ('gratis', 'basico', 'pro', 'max')),
  status text not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "dono lê assinatura" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.subscriptions to authenticated;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Cada geração de IA consumida. A cota é contada por mês (UTC).
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('plan', 'step', 'source')),
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;
create policy "dono lê uso" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.ai_usage to authenticated;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Reserva uma geração antes de chamar a IA. Falha com 'quota_exceeded' quando a cota
-- do mês acabou e com 'rate_limited' com mais de 5 gerações no último minuto.
-- O lock por usuário evita que pedidos simultâneos passem da cota.
create function public.claim_generation(p_user uuid, p_kind text, p_limit int)
returns table (usage_id bigint, used int)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_recent int;
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || p_user::text));

  select count(*)::int into v_used
  from public.ai_usage
  where user_id = p_user
    and created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';

  if v_used >= p_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  select count(*)::int into v_recent
  from public.ai_usage
  where user_id = p_user and created_at > now() - interval '1 minute';

  if v_recent >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.ai_usage (user_id, kind) values (p_user, p_kind) returning id into v_id;
  return query select v_id, v_used + 1;
end;
$$;

-- Devolve a geração quando a chamada à IA falha.
create function public.refund_generation(p_usage_id bigint)
returns void
language sql security definer set search_path = '' as $$
  delete from public.ai_usage where id = p_usage_id
$$;

revoke execute on function public.claim_generation(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.refund_generation(bigint) from public, anon, authenticated;
grant execute on function public.claim_generation(uuid, text, int) to service_role;
grant execute on function public.refund_generation(bigint) to service_role;

-- Meta diária, fuso horário (para o lembrete), opção de e-mail e boas-vindas.
alter table public.user_settings
  add column daily_goal int not null default 20 check (daily_goal between 1 and 1000),
  add column time_zone text not null default 'America/Sao_Paulo' check (char_length(time_zone) <= 64),
  add column email_reminders boolean not null default true,
  add column onboarded_at timestamptz;

-- Sequência de dias com pelo menos uma revisão (no fuso do usuário) e revisões de hoje.
-- A sequência atual continua viva se a última revisão foi hoje ou ontem.
create function public.study_streak(p_tz text)
returns table (current_streak int, best_streak int, reviews_today int)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select distinct (l.reviewed_at at time zone p_tz)::date as day
    from public.review_logs l
    where l.user_id = (select auth.uid())
  ),
  runs as (
    select day, day - (row_number() over (order by day))::int as grp from days
  ),
  islands as (
    select min(day) as first_day, max(day) as last_day, count(*)::int as len
    from runs group by grp
  ),
  today as (select (now() at time zone p_tz)::date as d)
  select
    coalesce((select i.len from islands i, today t where i.last_day >= t.d - 1 order by i.last_day desc limit 1), 0),
    coalesce((select max(len) from islands), 0),
    (select count(*)::int from public.review_logs l, today t
      where l.user_id = (select auth.uid()) and (l.reviewed_at at time zone p_tz)::date = t.d)
$$;

grant execute on function public.study_streak(text) to authenticated;
revoke execute on function public.study_streak(text) from anon;

-- Assinantes que devem receber o lembrete diário, com cartões para hoje e gerações usadas.
-- Só o servidor (cron) chama: lê e-mails de auth.users.
create function public.reminder_candidates()
returns table (
  user_id uuid,
  email text,
  plan text,
  time_zone text,
  due_today int,
  generations_used int
)
language sql stable security definer set search_path = '' as $$
  select
    s.user_id,
    u.email::text,
    s.plan,
    st.time_zone,
    (
      (select count(*) from public.cards c
        where c.user_id = s.user_id and c.state <> 0
          and (c.due at time zone st.time_zone)::date <= (now() at time zone st.time_zone)::date)
      + least(
        (select count(*) from public.cards c where c.user_id = s.user_id and c.state = 0),
        st.new_cards_per_day
      )
    )::int,
    (select count(*)::int from public.ai_usage a
      where a.user_id = s.user_id
        and a.created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC')
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  join public.user_settings st on st.user_id = s.user_id
  where s.plan <> 'gratis'
    and s.status in ('active', 'trialing')
    and st.email_reminders
    and u.email is not null
$$;

revoke execute on function public.reminder_candidates() from public, anon, authenticated;
grant execute on function public.reminder_candidates() to service_role;
