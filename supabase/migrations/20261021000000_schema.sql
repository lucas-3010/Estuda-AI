-- Estuda-AI: tabelas principais com RLS.

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) between 3 and 200),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  context text check (context is null or char_length(context) <= 1000),
  created_at timestamptz not null default now()
);

create table public.plan_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  position int not null check (position >= 0),
  title text not null,
  goal text not null,
  unique (plan_id, position)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_id uuid references public.plan_steps (id) on delete set null,
  front text not null check (char_length(front) > 0),
  back text not null check (char_length(back) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Estado FSRS
  due timestamptz not null default now(),
  stability float8 not null default 0,
  difficulty float8 not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz
);

create index cards_user_due_idx on public.cards (user_id, due);
create index cards_step_idx on public.cards (step_id);
create index plan_steps_plan_idx on public.plan_steps (plan_id);

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  state smallint not null check (state between 0 and 3),
  due timestamptz not null,
  stability float8 not null,
  difficulty float8 not null,
  elapsed_days int not null,
  scheduled_days int not null,
  reviewed_at timestamptz not null default now()
);

create index review_logs_user_reviewed_idx on public.review_logs (user_id, reviewed_at);
create index review_logs_card_idx on public.review_logs (card_id);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  new_cards_per_day int not null default 20 check (new_cards_per_day between 0 and 500),
  desired_retention float8 not null default 0.9 check (desired_retention between 0.7 and 0.99)
);

-- updated_at automático em cards
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();

-- Configurações criadas junto com o usuário
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: cada usuário só acessa as próprias linhas
alter table public.study_plans enable row level security;
alter table public.plan_steps enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.user_settings enable row level security;

create policy "dono acessa planos" on public.study_plans
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "dono acessa etapas" on public.plan_steps
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "dono acessa cartões" on public.cards
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Logs só são criados por record_review; o usuário apenas lê os seus
create policy "dono lê revisões" on public.review_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "dono lê configurações" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "dono altera configurações" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
