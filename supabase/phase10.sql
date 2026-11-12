-- Claqueta · Fase 10 (diario, actividad de amigos, estadísticas de uso y registro de errores)
-- Ejecuta DESPUÉS de phase9.sql. Es seguro ejecutarlo más de una vez.

-- ============ DIARIO: FECHA EN LA QUE VISTE CADA COSA ============
alter table public.user_titles add column if not exists watched_on date;
create index if not exists user_titles_watched_on_idx on public.user_titles (user_id, watched_on);

-- Títulos vistos en un año (fecha en que se vio o, si no consta, en que se marcó)
create or replace function public._year_rows(p_user uuid, y_start timestamptz, y_end timestamptz)
returns setof public.user_titles
language sql
stable
security definer set search_path = public
as $$
  select * from public.user_titles
  where user_id = p_user and status in ('visto', 'volver_a_ver')
    and coalesce(watched_on::timestamptz, updated_at) >= y_start
    and coalesce(watched_on::timestamptz, updated_at) < y_end;
$$;
revoke execute on function public._year_rows(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- El resumen del año usa la fecha en la que lo viste (si no la hay, la fecha en que lo marcaste)
create or replace function public.year_summary(p_user uuid, p_year integer)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  y_start timestamptz := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC');
  y_end timestamptz := make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC');
  base jsonb;
  eps bigint;
  tv_min bigint;
  genres jsonb;
  top jsonb;
  months jsonb;
begin
  if not public.can_view_profile(p_user) then
    return null;
  end if;

  select jsonb_build_object(
    'movies', count(*) filter (where media_type = 'movie'),
    'series', count(*) filter (where media_type = 'tv'),
    'movie_minutes', coalesce(sum(runtime_min) filter (where media_type = 'movie'), 0),
    'avg_rating', round(avg(rating), 1),
    'rated', count(rating)
  ) into base from public._year_rows(p_user, y_start, y_end) _ys;

  select count(*), coalesce(sum(ut.runtime_min), 0) into eps, tv_min
  from public.user_episodes ue
  left join public.user_titles ut
    on ut.user_id = ue.user_id and ut.tmdb_id = ue.tmdb_id and ut.media_type = 'tv'
  where ue.user_id = p_user and ue.watched_at >= y_start and ue.watched_at < y_end;

  select coalesce(jsonb_agg(jsonb_build_object('id', g.gid, 'n', g.n) order by g.n desc), '[]'::jsonb) into genres
  from (
    select gid, count(*) as n from public._year_rows(p_user, y_start, y_end) _ys, unnest(_ys.genres) as gid
    group by gid order by n desc limit 3
  ) g;

  select coalesce(jsonb_agg(jsonb_build_object(
      'tmdb_id', t.tmdb_id, 'media_type', t.media_type, 'title', t.title,
      'poster_path', t.poster_path, 'rating', t.rating) order by t.rating desc), '[]'::jsonb) into top
  from (select * from public._year_rows(p_user, y_start, y_end) _ys where rating is not null order by rating desc, updated_at desc limit 5) t;

  select coalesce(jsonb_agg(jsonb_build_object('m', m.mon, 'n', m.n) order by m.mon), '[]'::jsonb) into months
  from (
    select extract(month from d)::int as mon, count(*) as n
    from (
      select coalesce(watched_on::timestamptz, updated_at) as d from public._year_rows(p_user, y_start, y_end) _ys
      union all
      select watched_at from public.user_episodes
        where user_id = p_user and watched_at >= y_start and watched_at < y_end
    ) a
    group by 1
  ) m;

  return base || jsonb_build_object(
    'year', p_year, 'episodes', eps, 'tv_minutes', tv_min,
    'genres', genres, 'top', top, 'months', months
  );
end;
$$;

grant execute on function public.year_summary(uuid, integer) to anon, authenticated;

-- ============ ACTIVIDAD DE AMIGOS ============
-- Cada persona decide si su actividad sale en «Actividad» de quien la sigue (Ajustes)
alter table public.profiles add column if not exists share_activity boolean not null default true;

-- Lo último que han marcado las personas que sigues (solo si comparten su actividad y no hay bloqueo)
create or replace function public.friends_activity(p_limit integer default 40, p_before timestamptz default null)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  tmdb_id integer, media_type text, title text, poster_path text,
  status text, rating numeric, at timestamptz
)
language sql
stable
security definer set search_path = public
as $$
  select ut.user_id, p.username, p.display_name, p.avatar_url,
         ut.tmdb_id, ut.media_type, ut.title, ut.poster_path,
         ut.status, ut.rating, ut.updated_at
  from public.follows f
  join public.user_titles ut on ut.user_id = f.following_id
  join public.profiles p on p.id = ut.user_id
  where f.follower_id = auth.uid() and f.status = 'accepted'
    and p.share_activity and p.username is not null
    and (ut.status is not null or ut.rating is not null)
    and not public.blocked_between(auth.uid(), ut.user_id)
    and (p_before is null or ut.updated_at < p_before)
  order by ut.updated_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.friends_activity(integer, timestamptz) from public, anon;
grant execute on function public.friends_activity(integer, timestamptz) to authenticated;

-- ============ ESTADÍSTICAS DE USO (solo Admin, sin cookies ni datos personales) ============
create table if not exists public.analytics_daily (
  day date not null,
  path text not null,
  views integer not null default 0,
  primary key (day, path)
);
create table if not exists public.analytics_users (
  day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (day, user_id)
);
alter table public.analytics_daily enable row level security;
alter table public.analytics_users enable row level security;
revoke all on public.analytics_daily, public.analytics_users from anon, authenticated;

-- Cuenta una visita a una página (la llama la web en cada cambio de página)
create or replace function public.track_view(p_path text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  clean text := left(regexp_replace(coalesce(p_path, '/'), '[?#].*$', ''), 120);
begin
  -- Las direcciones con id se agrupan (/titulo/movie/123 → /titulo/movie/*)
  clean := regexp_replace(clean, '^/(titulo/(movie|tv))/\d+.*$', '/\1/*');
  clean := regexp_replace(clean, '^/(u|persona|listas|mensajes)/[^/]+', '/\1/*');
  insert into public.analytics_daily (day, path, views) values (current_date, clean, 1)
    on conflict (day, path) do update set views = analytics_daily.views + 1;
  if auth.uid() is not null then
    insert into public.analytics_users (day, user_id) values (current_date, auth.uid())
      on conflict do nothing;
  end if;
end;
$$;

grant execute on function public.track_view(text) to anon, authenticated;

create or replace function public.admin_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare since date := current_date - (least(greatest(p_days, 1), 365) - 1);
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'days', (
      select coalesce(jsonb_agg(jsonb_build_object('d', d::text, 'views', coalesce(v.views, 0), 'users', coalesce(u.users, 0)) order by d), '[]'::jsonb)
      from generate_series(since, current_date, interval '1 day') d
      left join (select day, sum(views) as views from public.analytics_daily where day >= since group by day) v on v.day = d
      left join (select day, count(*) as users from public.analytics_users where day >= since group by day) u on u.day = d
    ),
    'top', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc), '[]'::jsonb)
      from (select path, sum(views) as views from public.analytics_daily where day >= since group by path order by 2 desc limit 10) t
    ),
    'views', (select coalesce(sum(views), 0) from public.analytics_daily where day >= since),
    'active_users', (select count(distinct user_id) from public.analytics_users where day >= since)
  );
end;
$$;

revoke execute on function public.admin_analytics(integer) from public, anon;
grant execute on function public.admin_analytics(integer) to authenticated;

-- ============ REGISTRO DE ERRORES (con aviso al admin) ============
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null,
  stack text,
  path text,
  digest text,
  user_agent text,
  user_id uuid references auth.users(id) on delete set null
);
create index if not exists error_logs_created_idx on public.error_logs (created_at desc);
alter table public.error_logs enable row level security;
revoke all on public.error_logs from anon, authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('follow_request', 'follow', 'follow_accepted', 'reply', 'mention', 'recommendation', 'message',
   'new_user', 'new_episode', 'app_error'));

create or replace function public.log_error(p_message text, p_stack text, p_path text, p_digest text, p_ua text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Como mucho 30 errores por minuto en total (evita que un fallo en bucle llene la tabla)
  if (select count(*) from public.error_logs where created_at > now() - interval '1 minute') >= 30 then return; end if;
  insert into public.error_logs (message, stack, path, digest, user_agent, user_id)
  values (left(coalesce(p_message, '?'), 500), left(p_stack, 4000), left(p_path, 300), left(p_digest, 100), left(p_ua, 300), auth.uid());
  -- Aviso a los administradores (como mucho uno cada 30 minutos)
  if not exists (select 1 from public.notifications where type = 'app_error' and created_at > now() - interval '30 minutes') then
    insert into public.notifications (user_id, actor_id, type)
    select a.user_id, null, 'app_error' from public.admins a;
  end if;
end;
$$;

grant execute on function public.log_error(text, text, text, text, text) to anon, authenticated;

create or replace function public.admin_errors(p_limit integer default 30)
returns setof public.error_logs
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select * from public.error_logs order by created_at desc limit least(greatest(p_limit, 1), 200);
end;
$$;

revoke execute on function public.admin_errors(integer) from public, anon;
grant execute on function public.admin_errors(integer) to authenticated;

create or replace function public.admin_clear_errors()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.error_logs;
end;
$$;

revoke execute on function public.admin_clear_errors() from public, anon;
grant execute on function public.admin_clear_errors() to authenticated;
