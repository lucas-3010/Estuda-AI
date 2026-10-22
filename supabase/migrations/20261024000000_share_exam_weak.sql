-- Estuda-AI: baralhos compartilhados por link, data da prova, pontos fracos e novos tipos de geração.

-- Link público do plano (sem link = privado) e data da prova.
alter table public.study_plans
  add column share_token text unique
    check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{16,64}$'),
  add column exam_date date;

-- Conteúdo de um plano compartilhado: só tema, nível, etapas e cartões.
-- Nunca devolve o dono, o contexto nem o progresso. Visitantes sem login podem ler.
create function public.shared_plan(p_token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'topic', p.topic,
    'level', p.level,
    'steps', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'title', s.title,
          'goal', s.goal,
          'cards', coalesce((
            select jsonb_agg(jsonb_build_object('front', c.front, 'back', c.back) order by c.created_at, c.id)
            from public.cards c
            where c.step_id = s.id
          ), '[]'::jsonb)
        )
        order by s.position
      )
      from public.plan_steps s
      where s.plan_id = p.id
    ), '[]'::jsonb)
  )
  from public.study_plans p
  where p_token is not null and p.share_token = p_token
$$;

revoke execute on function public.shared_plan(text) from public;
grant execute on function public.shared_plan(text) to anon, authenticated;

-- Copia um plano compartilhado para a conta de quem está logado, com cartões novos.
create function public.copy_shared_plan(p_token text)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_plan jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;
  v_plan := public.shared_plan(p_token);
  if v_plan is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return public.save_plan(v_plan ->> 'topic', v_plan ->> 'level', null, v_plan -> 'steps');
end;
$$;

revoke execute on function public.copy_shared_plan(text) from public, anon;
grant execute on function public.copy_shared_plan(text) to authenticated;

-- Etapas em que a pessoa mais erra nos últimos p_days dias.
create function public.weak_steps(p_days int)
returns table (
  step_id uuid,
  plan_id uuid,
  topic text,
  level text,
  title text,
  goal text,
  reviews int,
  misses int
)
language sql stable security invoker set search_path = '' as $$
  select s.id, p.id, p.topic, p.level, s.title, s.goal, count(*)::int, count(*) filter (where l.rating = 1)::int
  from public.review_logs l
  join public.cards c on c.id = l.card_id
  join public.plan_steps s on s.id = c.step_id
  join public.study_plans p on p.id = s.plan_id
  where l.user_id = (select auth.uid())
    and l.reviewed_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
  group by s.id, p.id
  having count(*) filter (where l.rating = 1) > 0
  order by count(*) filter (where l.rating = 1)::float / count(*) desc, count(*) desc
  limit 10
$$;

revoke execute on function public.weak_steps(int) from public, anon;
grant execute on function public.weak_steps(int) to authenticated;

-- Novos tipos de geração que contam na cota mensal.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('plan', 'step', 'source', 'link', 'reinforce', 'exam'));
