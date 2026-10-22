-- Estuda-AI: provas reais importadas pela pessoa (PDF, foto ou texto) para treinar no quiz.

create table public.practice_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  -- Lista de questões: [{number, statement, options[], answer, fromKey}]
  questions jsonb not null
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 40),
  created_at timestamptz not null default now(),
  constraint practice_exams_size check (octet_length(questions::text) <= 400000)
);

create index practice_exams_user_idx on public.practice_exams (user_id, created_at desc);

alter table public.practice_exams enable row level security;

create policy "dono acessa provas" on public.practice_exams
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, delete on public.practice_exams to authenticated;

-- Importar uma prova conta como uma geração com IA.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('plan', 'step', 'source', 'link', 'reinforce', 'exam', 'import'));
