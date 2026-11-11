-- Claqueta · Fase 9 (velocidad, plataformas, resumen del año, avisos de capítulos y notificaciones push)
-- Ejecuta DESPUÉS de phase8.sql:
-- Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ BARRA SUPERIOR EN UNA SOLA CONSULTA ============
-- Antes la barra hacía hasta 5 consultas en cada página; ahora una.
create or replace function public.navbar_summary()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  adm boolean;
begin
  if me is null then return null; end if;
  adm := exists (select 1 from public.admins where user_id = me);
  return (
    select jsonb_build_object(
      'id', me,
      'email', (select email from auth.users where id = me),
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'pending', (select count(*) from public.follows where following_id = me and status = 'pending'),
      'unread', (select count(*) from public.notifications where user_id = me and read_at is null),
      'is_admin', adm,
      'open_reports', case when adm then (select count(*) from public.comment_reports where status = 'open') else 0 end
    )
    from (select 1) x
    left join public.profiles p on p.id = me
  );
end;
$$;

-- También la pueden llamar visitantes sin sesión (devuelve null): así la barra no hace consultas extra
revoke execute on function public.navbar_summary() from public;
grant execute on function public.navbar_summary() to anon, authenticated;
