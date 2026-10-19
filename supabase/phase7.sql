-- Claqueta · Mejoras (Descubrir gente afín, búsqueda de personas y panel de administración)
-- Ejecuta DESPUÉS de phase6.sql: Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ DESCUBRIR GENTE AFÍN ============
-- Para cada persona calcula un % de afinidad contigo con 3 señales:
--   géneros parecidos (45%), títulos en común (35%) y notas parecidas en esos títulos (20%).
-- Privacidad: de los perfiles PRIVADOS solo se devuelve nombre, foto y bio; nunca datos de su actividad.
create or replace function public.discover_people(p_limit integer default 36)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_private boolean,
  rel text,
  affinity integer,
  shared_count integer,
  shared jsonb
)
language sql
stable
security definer set search_path = public
as $$
  with me as (select auth.uid() as uid),
  mine as (
    select t.tmdb_id, t.media_type, t.rating
    from public.user_titles t join me on t.user_id = me.uid
    where t.status is not null
  ),
  my_genres as (
    select g, count(*)::float8 as c
    from public.user_titles t
    join me on t.user_id = me.uid
    cross join lateral unnest(coalesce(t.genres, '{}'::int[])) as g
    where t.status is not null
    group by g
  ),
  my_norm as (select sqrt(coalesce(sum(c * c), 0)) as n from my_genres),
  my_total as (select count(*)::float8 as n from mine),
  cands as (
    select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.is_private
    from public.profiles p join me on true
    where me.uid is not null
      and p.username is not null
      and p.id <> me.uid
      and not public.blocked_between(me.uid, p.id)
  ),
  pub as (select * from cands where not is_private),
  theirs as (
    select t.user_id as uid, count(*)::float8 as n
    from public.user_titles t join pub on pub.id = t.user_id
    where t.status is not null
    group by t.user_id
  ),
  common as (
    select t.user_id as uid, count(*)::float8 as n,
           avg(abs(m.rating - t.rating)) filter (where m.rating is not null and t.rating is not null) as rdiff
    from public.user_titles t
    join pub on pub.id = t.user_id
    join mine m on m.tmdb_id = t.tmdb_id and m.media_type = t.media_type
    where t.status is not null
    group by t.user_id
  ),
  cg as (
    select t.user_id as uid, g, count(*)::float8 as cnt
    from public.user_titles t
    join pub on pub.id = t.user_id
    cross join lateral unnest(coalesce(t.genres, '{}'::int[])) as g
    where t.status is not null
    group by t.user_id, g
  ),
  cnorm as (select uid, sqrt(sum(cnt * cnt)) as n from cg group by uid),
  cdot as (
    select cg.uid, sum(cg.cnt * mg.c) as d
    from cg join my_genres mg on mg.g = cg.g
    group by cg.uid
  ),
  scored as (
    select c.id, c.username, c.display_name, c.avatar_url, c.bio, c.is_private,
      case when c.is_private then null else
        least(99, round(100 * (
          0.45 * coalesce(cdot.d / nullif(cnorm.n * (select n from my_norm), 0), 0)
          + 0.35 * coalesce(common.n / nullif((select n from my_total) + theirs.n - common.n, 0), 0)
          + 0.20 * coalesce(1 - common.rdiff / 10.0, 0)
        )))::integer
      end as aff,
      coalesce(common.n, 0)::integer as shared_n
    from cands c
    left join cdot on cdot.uid = c.id
    left join cnorm on cnorm.uid = c.id
    left join common on common.uid = c.id
    left join theirs on theirs.uid = c.id
  )
  select
    s.id, s.username, s.display_name, s.avatar_url, s.bio, s.is_private,
    coalesce((
      select f.status from public.follows f
      where f.follower_id = (select uid from me) and f.following_id = s.id
    ), 'none'),
    s.aff,
    s.shared_n,
    case when s.is_private then null else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tmdb_id', q.tmdb_id, 'media_type', q.media_type, 'title', q.title, 'poster_path', q.poster_path
      )), '[]'::jsonb)
      from (
        select t.tmdb_id, t.media_type, t.title, t.poster_path
        from public.user_titles t
        join mine m on m.tmdb_id = t.tmdb_id and m.media_type = t.media_type
        where t.user_id = s.id and t.status is not null
        order by t.rating desc nulls last
        limit 3
      ) q
    ) end
  from scored s
  order by s.is_private, s.aff desc nulls last, s.username
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.discover_people(integer) from public, anon;
grant execute on function public.discover_people(integer) to authenticated;

-- ============ BÚSQUEDA DE PERSONAS (ahora también por parte del usuario o del nombre) ============
create or replace function public.search_people(p_q text)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer set search_path = public
as $$
  select pr.id, pr.username, pr.display_name, pr.avatar_url
  from public.profiles pr
  where pr.username is not null
    and length(trim(p_q)) >= 2
    and (
      position(lower(trim(p_q)) in pr.username) > 0
      or position(lower(trim(p_q)) in lower(coalesce(pr.display_name, ''))) > 0
    )
    and (auth.uid() is null or not public.blocked_between(auth.uid(), pr.id))
  order by starts_with(pr.username, lower(trim(p_q))) desc, pr.username
  limit 12;
$$;

-- ============ ADMINISTRACIÓN ============
-- Todas estas funciones comprueban DENTRO de la base de datos que quien llama es administrador.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'with_username', (select count(*) from public.profiles where username is not null),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'private_profiles', (select count(*) from public.profiles where is_private),
    'titles', (select count(*) from public.user_titles),
    'comments', (select count(*) from public.comments),
    'lists', (select count(*) from public.lists),
    'messages', (select count(*) from public.messages),
    'admins', (select count(*) from public.admins),
    'silenced', (select count(*) from public.comment_blocks),
    'open_reports', (select count(*) from public.comment_reports where status = 'open')
  );
end;
$$;

create or replace function public.admin_users(p_q text default '', p_limit integer default 20, p_offset integer default 0)
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_url text,
  is_private boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean,
  is_silenced boolean,
  titles bigint,
  comments bigint,
  total bigint
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  q text := coalesce(btrim(p_q), '');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    u.id,
    u.email::text,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(p.is_private, false),
    u.created_at,
    u.last_sign_in_at,
    exists (select 1 from public.admins a where a.user_id = u.id),
    exists (select 1 from public.comment_blocks b where b.user_id = u.id),
    (select count(*) from public.user_titles t where t.user_id = u.id),
    (select count(*) from public.comments c where c.user_id = u.id),
    count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where q = ''
     or u.email ilike '%' || q || '%'
     or p.username ilike '%' || q || '%'
     or p.display_name ilike '%' || q || '%'
  order by u.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
end;
$$;

-- Hacer o quitar administrador (no puedes quitártelo a ti ni dejar la web sin administradores)
create or replace function public.admin_set_admin(p_user uuid, p_make boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_make then
    insert into public.admins (user_id) values (p_user) on conflict do nothing;
  else
    if p_user = auth.uid() then raise exception 'self'; end if;
    if (select count(*) from public.admins) <= 1 then raise exception 'last_admin'; end if;
    delete from public.admins where user_id = p_user;
  end if;
end;
$$;

-- Silenciar (no puede escribir mensajes) o quitar el silencio
create or replace function public.admin_set_silence(p_user uuid, p_on boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'self'; end if;
  if p_on then
    insert into public.comment_blocks (user_id, reason) values (p_user, 'Moderación') on conflict do nothing;
  else
    delete from public.comment_blocks where user_id = p_user;
  end if;
end;
$$;

-- Borrar una cuenta y todos sus datos (a otro administrador primero hay que quitarle el cargo)
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'self'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'is_admin'; end if;
  delete from storage.objects where bucket_id = 'avatars' and name like p_user::text || '/%';
  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_users(text, integer, integer) from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke all on function public.admin_set_silence(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users(text, integer, integer) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_set_silence(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
