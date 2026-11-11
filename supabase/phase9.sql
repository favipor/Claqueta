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

-- ============ TUS PLATAFORMAS ============
-- Plataformas de streaming que tienes (ids de TMDB): para filtrar el catálogo con «Solo en mis plataformas»
alter table public.profiles add column if not exists providers integer[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_providers_len;
alter table public.profiles add constraint profiles_providers_len check (cardinality(providers) <= 30);

-- ============ RESUMEN DEL AÑO ============
-- «Tu 2026 en Claqueta»: lo visto en el año, horas, géneros, mejores notas y mes más activo.
-- Respeta la privacidad del perfil (si no puedes ver el perfil, devuelve null).
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
  ) into base
  from public.user_titles
  where user_id = p_user and status in ('visto', 'volver_a_ver')
    and updated_at >= y_start and updated_at < y_end;

  select count(*), coalesce(sum(ut.runtime_min), 0) into eps, tv_min
  from public.user_episodes ue
  left join public.user_titles ut
    on ut.user_id = ue.user_id and ut.tmdb_id = ue.tmdb_id and ut.media_type = 'tv'
  where ue.user_id = p_user and ue.watched_at >= y_start and ue.watched_at < y_end;

  select coalesce(jsonb_agg(jsonb_build_object('id', g.gid, 'n', g.n) order by g.n desc), '[]'::jsonb) into genres
  from (
    select gid, count(*) as n
    from public.user_titles ut2, unnest(ut2.genres) as gid
    where ut2.user_id = p_user and ut2.status in ('visto', 'volver_a_ver')
      and ut2.updated_at >= y_start and ut2.updated_at < y_end
    group by gid order by n desc limit 3
  ) g;

  select coalesce(jsonb_agg(jsonb_build_object(
      'tmdb_id', t.tmdb_id, 'media_type', t.media_type, 'title', t.title,
      'poster_path', t.poster_path, 'rating', t.rating) order by t.rating desc, t.updated_at desc), '[]'::jsonb) into top
  from (
    select * from public.user_titles
    where user_id = p_user and rating is not null
      and updated_at >= y_start and updated_at < y_end
    order by rating desc, updated_at desc limit 5
  ) t;

  -- Actividad por mes (títulos vistos + capítulos)
  select coalesce(jsonb_agg(jsonb_build_object('m', m.mon, 'n', m.n) order by m.mon), '[]'::jsonb) into months
  from (
    select extract(month from d)::int as mon, count(*) as n
    from (
      select updated_at as d from public.user_titles
        where user_id = p_user and status in ('visto', 'volver_a_ver') and updated_at >= y_start and updated_at < y_end
      union all
      select watched_at from public.user_episodes
        where user_id = p_user and watched_at >= y_start and watched_at < y_end
    ) a
    group by 1
  ) m;

  return base || jsonb_build_object(
    'year', p_year,
    'episodes', eps,
    'tv_minutes', tv_min,
    'genres', genres,
    'top', top,
    'months', months
  );
end;
$$;

grant execute on function public.year_summary(uuid, integer) to anon, authenticated;

-- ============ AVISO DE CAPÍTULO NUEVO ============
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('follow_request', 'follow', 'follow_accepted', 'reply', 'mention', 'recommendation', 'message',
   'new_user', 'new_episode'));

-- La llama cada día el servidor (tarea programada de Vercel) cuando sale un capítulo de una serie:
-- avisa a quien la está viendo (sin repetir el aviso en 3 días). Solo la puede llamar el servidor.
create or replace function public.notify_new_episode(p_tmdb_id integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare n integer;
begin
  insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type)
  select ut.user_id, null, 'new_episode', p_tmdb_id, 'tv'
  from public.user_titles ut
  where ut.tmdb_id = p_tmdb_id and ut.media_type = 'tv' and ut.status = 'viendo'
    and not exists (
      select 1 from public.notifications x
      where x.user_id = ut.user_id and x.type = 'new_episode' and x.tmdb_id = p_tmdb_id
        and x.created_at > now() - interval '3 days'
    );
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.notify_new_episode(integer) from public, anon, authenticated;
grant execute on function public.notify_new_episode(integer) to service_role;

-- Series que alguien está viendo (para la tarea diaria). Solo servidor.
create or replace function public.watching_series()
returns table (tmdb_id integer)
language sql
stable
security definer set search_path = public
as $$
  select distinct ut.tmdb_id from public.user_titles ut where ut.media_type = 'tv' and ut.status = 'viendo';
$$;

revoke execute on function public.watching_series() from public, anon, authenticated;
grant execute on function public.watching_series() to service_role;

-- ============ NOTIFICACIONES PUSH (en el móvil, aunque la app esté cerrada) ============
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Cada notificación nueva avisa a la web (que es quien envía el push al móvil).
-- La clave secreta se guarda cifrada en Supabase Vault con el nombre 'push_webhook_secret'
-- (se crea aparte, ver instrucciones). Si no existe, simplemente no se envían pushes.
create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare secret text;
begin
  begin
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret' limit 1;
  exception when others then
    secret := null;
  end;
  if secret is null then return null; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then return null; end if;

  perform net.http_post(
    url := 'https://miclaqueta.com/api/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('notification_id', new.id)
  );
  return null;
exception when others then
  return null; -- un fallo del aviso nunca debe impedir que se cree la notificación
end;
$$;

drop trigger if exists push_on_notification_trg on public.notifications;
create trigger push_on_notification_trg
  after insert on public.notifications
  for each row execute function public.push_on_notification();

revoke execute on function public.push_on_notification() from public, anon, authenticated;
