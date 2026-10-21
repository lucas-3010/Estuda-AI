-- Funções de gatilho não devem ser chamáveis pela API e usam search_path fixo
-- (avisos do Security Advisor do Supabase). Gatilhos continuam disparando:
-- o privilégio EXECUTE só é checado ao criar o gatilho.
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
