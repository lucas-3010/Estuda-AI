-- Estuda-AI: funções de revisão e estatísticas.

-- Grava a revisão e o novo estado FSRS do cartão numa única transação.
-- O log guarda o estado do cartão ANTES da revisão (como o ReviewLog do FSRS).
-- security definer porque review_logs não aceita insert direto do usuário;
-- a posse do cartão é verificada explicitamente com auth.uid().
create function public.record_review(p_card_id uuid, p_rating smallint, p_next jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_card public.cards;
begin
  if (select auth.uid()) is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;

  select * into v_card
  from public.cards
  where id = p_card_id and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'cartão não encontrado' using errcode = 'P0002';
  end if;

  insert into public.review_logs (
    user_id, card_id, rating, state, due, stability, difficulty, elapsed_days, scheduled_days
  ) values (
    v_card.user_id, v_card.id, p_rating, v_card.state, v_card.due, v_card.stability,
    v_card.difficulty, v_card.elapsed_days, v_card.scheduled_days
  );

  update public.cards set
    due = (p_next ->> 'due')::timestamptz,
    stability = (p_next ->> 'stability')::float8,
    difficulty = (p_next ->> 'difficulty')::float8,
    elapsed_days = (p_next ->> 'elapsed_days')::int,
    scheduled_days = (p_next ->> 'scheduled_days')::int,
    learning_steps = (p_next ->> 'learning_steps')::int,
    reps = (p_next ->> 'reps')::int,
    lapses = (p_next ->> 'lapses')::int,
    state = (p_next ->> 'state')::smallint,
    last_review = (p_next ->> 'last_review')::timestamptz
  where id = v_card.id;
end;
$$;

-- Revisões por dia (no fuso do usuário) nos últimos p_days dias, incluindo hoje.
create function public.review_stats(p_days int, p_tz text)
returns table (day date, reviews int, correct int)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select generate_series(
      (now() at time zone p_tz)::date - (p_days - 1),
      (now() at time zone p_tz)::date,
      interval '1 day'
    )::date as day
  )
  select d.day,
         count(l.id)::int as reviews,
         count(l.id) filter (where l.rating > 1)::int as correct
  from days d
  left join public.review_logs l
    on (l.reviewed_at at time zone p_tz)::date = d.day
   and l.user_id = (select auth.uid())
  group by d.day
  order by d.day
$$;

-- Cartões já estudados que vencem em cada um dos próximos p_days dias.
-- Atrasados entram no dia de hoje.
create function public.due_forecast(p_days int, p_tz text)
returns table (day date, due_count int)
language sql stable security invoker set search_path = '' as $$
  with today as (select (now() at time zone p_tz)::date as d),
  days as (
    select generate_series(t.d, t.d + (p_days - 1), interval '1 day')::date as day from today t
  )
  select days.day,
         count(c.id)::int as due_count
  from days
  cross join today
  left join public.cards c
    on c.user_id = (select auth.uid())
   and c.state <> 0
   and greatest((c.due at time zone p_tz)::date, today.d) = days.day
  group by days.day
  order by days.day
$$;

-- Quantos cartões novos (estado 0 no momento da revisão) foram estudados hoje.
create function public.new_cards_studied_today(p_tz text)
returns int
language sql stable security invoker set search_path = '' as $$
  select count(*)::int
  from public.review_logs l
  where l.user_id = (select auth.uid())
    and l.state = 0
    and (l.reviewed_at at time zone p_tz)::date = (now() at time zone p_tz)::date
$$;

revoke execute on function public.record_review(uuid, smallint, jsonb) from public, anon;
revoke execute on function public.review_stats(int, text) from public, anon;
revoke execute on function public.due_forecast(int, text) from public, anon;
revoke execute on function public.new_cards_studied_today(text) from public, anon;
grant execute on function public.record_review(uuid, smallint, jsonb) to authenticated;
grant execute on function public.review_stats(int, text) to authenticated;
grant execute on function public.due_forecast(int, text) to authenticated;
grant execute on function public.new_cards_studied_today(text) to authenticated;
