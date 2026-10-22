-- Estuda-AI: caderno de erros, edital vira plano e modo lei seca.

-- Tipo do plano: tema comum, edital de concurso, lei seca ou o caderno de erros.
alter table public.study_plans
  add column kind text not null default 'topic'
    check (kind in ('topic', 'edital', 'law', 'mistakes'));

-- Um único caderno de erros por pessoa.
create unique index study_plans_one_mistakes_idx on public.study_plans (user_id) where kind = 'mistakes';

-- Etapa "Meus erros" dentro de um plano (no máximo uma por plano).
alter table public.plan_steps
  add column kind text not null default 'normal' check (kind in ('normal', 'mistakes'));

create unique index plan_steps_one_mistakes_idx on public.plan_steps (plan_id) where kind = 'mistakes';

-- De onde veio o cartão (selo na revisão), o tópico do edital e o artigo da lei.
alter table public.cards
  add column origin text check (origin in ('mistake', 'law')),
  add column topic text check (topic is null or char_length(topic) <= 300),
  add column law_ref text check (law_ref is null or char_length(law_ref) <= 200);

-- save_plan passa a gravar também origem, tópico e artigo de cada cartão (campos opcionais).
create or replace function public.save_plan(p_topic text, p_level text, p_context text, p_steps jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_plan_id uuid;
  v_step_id uuid;
  v_step jsonb;
  v_card jsonb;
  v_step_pos int := 0;
  v_order int := 0;
  v_now timestamptz := now();
begin
  insert into public.study_plans (topic, level, context)
  values (p_topic, p_level, nullif(p_context, ''))
  returning id into v_plan_id;

  for v_step in select * from jsonb_array_elements(p_steps) loop
    insert into public.plan_steps (plan_id, position, title, goal)
    values (v_plan_id, v_step_pos, v_step ->> 'title', v_step ->> 'goal')
    returning id into v_step_id;
    v_step_pos := v_step_pos + 1;

    for v_card in select * from jsonb_array_elements(v_step -> 'cards') loop
      insert into public.cards (step_id, front, back, due, origin, topic, law_ref)
      values (v_step_id, v_card ->> 'front', v_card ->> 'back',
              v_now + make_interval(secs => v_order / 1000.0),
              v_card ->> 'origin', nullif(v_card ->> 'topic', ''), nullif(v_card ->> 'law_ref', ''));
      v_order := v_order + 1;
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

-- Caderno de erros: guarda a questão errada como cartão na etapa "Meus erros".
-- Sem plano, vai para o plano "Caderno de erros" da pessoa (criado na primeira vez).
-- A mesma questão não entra duas vezes.
create function public.add_mistake(p_plan_id uuid, p_front text, p_back text)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_plan uuid := p_plan_id;
  v_step uuid;
  v_card uuid;
  v_pos int;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if coalesce(char_length(p_front), 0) not between 1 and 20000
     or coalesce(char_length(p_back), 0) not between 1 and 20000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  if v_plan is null then
    insert into public.study_plans (topic, level, kind)
    values ('Caderno de erros', 'intermediario', 'mistakes')
    on conflict (user_id) where kind = 'mistakes' do nothing;
    select id into v_plan from public.study_plans
    where user_id = (select auth.uid()) and kind = 'mistakes';
  else
    -- O RLS só deixa ver os planos da própria pessoa.
    perform 1 from public.study_plans where id = v_plan;
    if not found then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
  end if;

  select id into v_step from public.plan_steps where plan_id = v_plan and kind = 'mistakes';
  if not found then
    select coalesce(max(position) + 1, 0) into v_pos from public.plan_steps where plan_id = v_plan;
    insert into public.plan_steps (plan_id, position, title, goal, kind)
    values (v_plan, v_pos, 'Meus erros',
            'Questões que você errou no quiz e no simulado, para não errar de novo.', 'mistakes')
    on conflict (plan_id) where kind = 'mistakes' do nothing;
    select id into v_step from public.plan_steps where plan_id = v_plan and kind = 'mistakes';
  end if;

  select id into v_card from public.cards where step_id = v_step and front = p_front limit 1;
  if found then
    return v_card;
  end if;

  insert into public.cards (step_id, front, back, origin)
  values (v_step, p_front, p_back, 'mistake')
  returning id into v_card;
  return v_card;
end;
$$;

revoke execute on function public.add_mistake(uuid, text, text) from public, anon;
grant execute on function public.add_mistake(uuid, text, text) to authenticated;

-- Edital lido pela IA. Só o servidor cria a linha (depois de cobrar uma geração);
-- a pessoa lê o seu e transforma em plano com create_edital_plan.
create table public.editais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid unique references public.study_plans (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  banca text check (banca is null or char_length(banca) <= 100),
  -- [{name, weight (1 a 5), topics: [texto]}]
  disciplines jsonb not null
    check (jsonb_typeof(disciplines) = 'array' and jsonb_array_length(disciplines) between 1 and 12),
  -- Disciplinas cujos cartões já foram gerados (posição na lista) e tentativas usadas.
  generated int[] not null default '{}',
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  constraint editais_size check (octet_length(disciplines::text) <= 100000)
);

create index editais_user_idx on public.editais (user_id, created_at desc);

alter table public.editais enable row level security;
create policy "dono lê editais" on public.editais
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.editais from anon, authenticated;
grant select on public.editais to authenticated;

-- Transforma o edital (com as edições da pessoa) num plano com uma etapa por disciplina.
-- A pessoa pode tirar disciplinas, renomear e mudar pesos, mas não aumentar a lista.
create function public.create_edital_plan(p_edital_id uuid, p_disciplines jsonb, p_exam_date date)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_edital public.editais;
  v_plan uuid;
  v_item jsonb;
  v_pos int := 0;
  v_name text;
  v_weight int;
  v_topics int;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_edital from public.editais
  where id = p_edital_id and user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_edital.plan_id is not null then
    raise exception 'already_created' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_disciplines) is distinct from 'array'
     or jsonb_array_length(p_disciplines) < 1
     or jsonb_array_length(p_disciplines) > jsonb_array_length(v_edital.disciplines)
     or octet_length(p_disciplines::text) > 100000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  insert into public.study_plans (user_id, topic, level, context, kind, exam_date)
  values (v_edital.user_id, left(v_edital.title, 200), 'intermediario',
          case when v_edital.banca is null then null else 'Banca: ' || v_edital.banca end,
          'edital', p_exam_date)
  returning id into v_plan;

  for v_item in select * from jsonb_array_elements(p_disciplines) loop
    v_name := trim(v_item ->> 'name');
    v_weight := (v_item ->> 'weight')::int;
    if v_name is null or char_length(v_name) not between 1 and 200
       or v_weight is null or v_weight not between 1 and 5
       or jsonb_typeof(v_item -> 'topics') is distinct from 'array'
       or jsonb_array_length(v_item -> 'topics') > 40 then
      raise exception 'invalid_input' using errcode = 'P0001';
    end if;
    v_topics := jsonb_array_length(v_item -> 'topics');
    insert into public.plan_steps (user_id, plan_id, position, title, goal)
    values (v_edital.user_id, v_plan, v_pos, v_name,
            'Peso ' || v_weight || ' de 5 no edital · ' || v_topics
              || case when v_topics = 1 then ' tópico' else ' tópicos' end);
    v_pos := v_pos + 1;
  end loop;

  update public.editais set plan_id = v_plan, disciplines = p_disciplines where id = v_edital.id;
  return v_plan;
end;
$$;

revoke execute on function public.create_edital_plan(uuid, jsonb, date) from public, anon;
grant execute on function public.create_edital_plan(uuid, jsonb, date) to authenticated;

-- Reserva a geração dos cartões de uma disciplina do edital. Cada disciplina gera uma vez
-- (com uma folga de tentativas para falhas): o edital inteiro conta como uma geração na cota.
create function public.claim_edital_step(p_user uuid, p_edital_id uuid, p_index int)
returns table (
  plan_id uuid,
  step_id uuid,
  title text,
  banca text,
  discipline jsonb,
  discipline_count int,
  plan_created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  v_edital public.editais;
  v_count int;
begin
  select * into v_edital from public.editais e
  where e.id = p_edital_id and e.user_id = p_user
  for update;
  if not found or v_edital.plan_id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  v_count := jsonb_array_length(v_edital.disciplines);
  if p_index < 0 or p_index >= v_count then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_index = any (v_edital.generated) then
    raise exception 'already_generated' using errcode = 'P0001';
  end if;
  if v_edital.attempts >= v_count * 2 then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  update public.editais e
  set generated = e.generated || p_index, attempts = e.attempts + 1
  where e.id = v_edital.id;

  return query
  select v_edital.plan_id, s.id, v_edital.title, v_edital.banca, v_edital.disciplines -> p_index, v_count, p.created_at
  from public.plan_steps s
  join public.study_plans p on p.id = s.plan_id
  where s.plan_id = v_edital.plan_id and s.position = p_index;
end;
$$;

-- Devolve a disciplina quando a IA falha, para a pessoa tentar de novo.
create function public.release_edital_step(p_edital_id uuid, p_index int)
returns void
language sql security definer set search_path = '' as $$
  update public.editais set generated = array_remove(generated, p_index) where id = p_edital_id
$$;

revoke execute on function public.claim_edital_step(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.release_edital_step(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_edital_step(uuid, uuid, int) to service_role;
grant execute on function public.release_edital_step(uuid, int) to service_role;

-- Lei seca: texto de cada artigo usado nos cartões, para avisar quando a lei mudar.
-- O hash é calculado aqui; o texto já chega normalizado (sem espaços repetidos).
create table public.law_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  source_url text check (source_url is null or char_length(source_url) <= 2000),
  law_name text not null check (char_length(law_name) between 1 and 200),
  article text not null check (char_length(article) between 1 and 40),
  snapshot text not null check (char_length(snapshot) between 1 and 20000),
  text_hash text generated always as (md5(snapshot)) stored,
  -- Preenchidos pela verificação diária quando o texto na fonte muda.
  current_snapshot text check (current_snapshot is null or char_length(current_snapshot) <= 20000),
  changed_at timestamptz,
  checked_at timestamptz,
  unique (plan_id, article)
);

create index law_articles_user_idx on public.law_articles (user_id);
create index law_articles_source_idx on public.law_articles (source_url) where source_url is not null;

alter table public.law_articles enable row level security;
create policy "dono lê artigos" on public.law_articles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono grava artigos" on public.law_articles
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );
revoke all on public.law_articles from anon, authenticated;
grant select, insert (plan_id, source_url, law_name, article, snapshot) on public.law_articles to authenticated;

-- "Já revisei": aceita o texto novo como referência e tira o aviso.
create function public.acknowledge_law_change(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.law_articles
  set snapshot = coalesce(current_snapshot, snapshot), current_snapshot = null, changed_at = null
  where id = p_id and user_id = (select auth.uid());
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.acknowledge_law_change(uuid) from public, anon;
grant execute on function public.acknowledge_law_change(uuid) to authenticated;

-- Novos tipos de geração que contam na cota mensal.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('plan', 'step', 'source', 'link', 'reinforce', 'exam', 'import', 'edital', 'law'));
