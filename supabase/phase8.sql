-- Claqueta · Fase 8 (aviso de registro al administrador y capacidad de la base de datos)
-- Ejecuta DESPUÉS de phase7.sql:
-- Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ AVISO DE NUEVO REGISTRO ============
-- Nuevo tipo de notificación: «new_user»
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('follow_request', 'follow', 'follow_accepted', 'reply', 'mention', 'recommendation', 'message', 'new_user'));

-- Cuando alguien termina de registrarse (elige su @usuario), se avisa a todos los administradores.
-- Se espera a que tenga usuario para que el aviso pueda llevar a su perfil.
create or replace function public.notify_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.username is null and new.username is not null then
    insert into public.notifications (user_id, actor_id, type)
    select a.user_id, new.id, 'new_user'
    from public.admins a
    where a.user_id <> new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists notify_new_user_trg on public.profiles;
create trigger notify_new_user_trg
  after update of username on public.profiles
  for each row execute function public.notify_new_user();

revoke execute on function public.notify_new_user() from public, anon, authenticated;

-- ============ CAPACIDAD (solo administradores) ============
-- Tamaño de la base de datos, de los archivos subidos (fotos de perfil) y de las tablas que más ocupan.
create or replace function public.admin_db_usage()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o),
    'storage_files', (select count(*) from storage.objects),
    'tables', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (
        select c.relname as name, pg_total_relation_size(c.oid) as bytes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
        limit 6
      ) t
    )
  );
end;
$$;

revoke execute on function public.admin_db_usage() from public, anon;
grant execute on function public.admin_db_usage() to authenticated;
