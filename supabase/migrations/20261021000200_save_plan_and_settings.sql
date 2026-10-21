-- Estuda-AI: gravação atômica de planos, upsert de configurações e acesso anônimo fechado.

-- Salva plano, etapas e cartões numa única transação. Os cartões novos recebem
-- vencimentos escalonados (1 ms) para que a fila siga a ordem do plano.
create function public.save_plan(p_topic text, p_level text, p_context text, p_steps jsonb)
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
      insert into public.cards (step_id, front, back, due)
      values (v_step_id, v_card ->> 'front', v_card ->> 'back',
              v_now + make_interval(secs => v_order / 1000.0));
      v_order := v_order + 1;
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

revoke execute on function public.save_plan(text, text, text, jsonb) from public, anon;
grant execute on function public.save_plan(text, text, text, jsonb) to authenticated;

-- Configurações: permite criar a linha caso o gatilho não a tenha criado.
create policy "dono cria configurações" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
grant insert on public.user_settings to authenticated;

-- Nenhuma tabela do app é acessível sem login, independentemente dos privilégios padrão.
revoke all on public.study_plans, public.plan_steps, public.cards, public.review_logs, public.user_settings from anon;
