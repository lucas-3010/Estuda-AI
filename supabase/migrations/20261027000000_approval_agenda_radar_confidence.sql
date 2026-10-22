-- Estuda-AI: chance de aprovação, agenda do dia, radar de editais e "Tenho certeza?".

-- Chance de aprovação: nota de corte do plano, em porcentagem dos pontos da prova, e de onde ela veio.
alter table public.study_plans
  add column cutoff numeric(5, 2) check (cutoff is null or cutoff between 0 and 100),
  add column cutoff_note text check (cutoff_note is null or char_length(cutoff_note) <= 500);

-- Agenda do dia: minutos de estudo em cada dia da semana (domingo primeiro). Nulo = ainda não configurada.
alter table public.user_settings
  add column study_minutes smallint[]
    check (
      study_minutes is null
      or (cardinality(study_minutes) = 7 and 0 <= all (study_minutes) and 600 >= all (study_minutes))
    );

-- "Tenho certeza?": a confiança marcada antes de ver a resposta (nulo quando a pessoa não marcou).
alter table public.review_logs add column confident boolean;

drop function public.record_review(uuid, smallint, jsonb);

create function public.record_review(p_card_id uuid, p_rating smallint, p_next jsonb, p_confident boolean default null)
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
    user_id, card_id, rating, state, due, stability, difficulty, elapsed_days, scheduled_days, confident
  ) values (
    v_card.user_id, v_card.id, p_rating, v_card.state, v_card.due, v_card.stability,
    v_card.difficulty, v_card.elapsed_days, v_card.scheduled_days, p_confident
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

revoke execute on function public.record_review(uuid, smallint, jsonb, boolean) from public, anon;
grant execute on function public.record_review(uuid, smallint, jsonb, boolean) to authenticated;

-- Calibração: quantas vezes a pessoa acertou quando disse que tinha certeza e quando chutou.
create function public.confidence_stats(p_days int)
returns table (sure_total int, sure_correct int, guess_total int, guess_correct int)
language sql stable security invoker set search_path = '' as $$
  select
    count(*) filter (where confident)::int,
    count(*) filter (where confident and rating > 1)::int,
    count(*) filter (where not confident)::int,
    count(*) filter (where not confident and rating > 1)::int
  from public.review_logs
  where user_id = (select auth.uid())
    and confident is not null
    and reviewed_at >= now() - make_interval(days => least(greatest(p_days, 1), 365))
$$;

revoke execute on function public.confidence_stats(int) from public, anon;
grant execute on function public.confidence_stats(int) to authenticated;

-- Radar de editais: cargos ou órgãos que a pessoa acompanha. A verificação diária (servidor)
-- procura o edital e preenche found_*; a pessoa dispensa o aviso marcando seen_at.
create table public.edital_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  query text not null check (char_length(query) between 3 and 120),
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  found_title text check (found_title is null or char_length(found_title) <= 300),
  found_url text check (found_url is null or char_length(found_url) <= 2000),
  found_at timestamptz,
  seen_at timestamptz
);

create index edital_watches_user_idx on public.edital_watches (user_id, created_at);
create index edital_watches_pending_idx on public.edital_watches (checked_at nulls first) where found_at is null;

alter table public.edital_watches enable row level security;
create policy "dono lê radar" on public.edital_watches
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono cria radar" on public.edital_watches
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "dono dispensa aviso" on public.edital_watches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "dono apaga radar" on public.edital_watches
  for delete to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.edital_watches from anon, authenticated;
grant select, insert (query), update (seen_at), delete on public.edital_watches to authenticated;

-- No máximo 3 buscas por pessoa: cada uma custa uma pesquisa com IA por dia.
create function public.limit_edital_watches()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from public.edital_watches where user_id = new.user_id) >= 3 then
    raise exception 'watch_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_edital_watches() from public, anon, authenticated;

create trigger edital_watches_limit
  before insert on public.edital_watches
  for each row execute function public.limit_edital_watches();

-- Estimativa da nota de corte com IA conta como uma geração.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('plan', 'step', 'source', 'link', 'reinforce', 'exam', 'import', 'edital', 'law', 'cutoff'));
