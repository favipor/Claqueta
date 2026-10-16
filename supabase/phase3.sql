-- Claqueta · Fase 3 (perfil, usuario único, privacidad y seguimiento)
-- Ejecuta DESPUÉS de schema.sql y phase2.sql:
-- Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ PERFILES: columnas nuevas ============
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists is_private boolean not null default false,
  add column if not exists privacy_changed_at timestamptz;

-- Hasta ahora "username" guardaba el nombre de Google / email. Ese texto pasa a ser el nombre visible
-- y el usuario (@) se elige al registrarse.
update public.profiles set display_name = username where display_name is null;
update public.profiles set username = null
  where username is not null and username !~ '^[a-z0-9_]{3,20}$';

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (
    username is null or (
      username ~ '^[a-z0-9_]{3,20}$'
      and username not in ('admin','administrador','claqueta','soporte','support','moderador',
                           'moderator','root','api','null','undefined','ayuda','help')
    )
  );

alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 160);

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 50);

-- Los perfiles públicos se pueden ver sin iniciar sesión (solo datos básicos: nunca el email)
drop policy if exists "profiles_select_anon" on public.profiles;
create policy "profiles_select_anon" on public.profiles
  for select to anon using (true);

-- Perfil nuevo: sin usuario (@) todavía y sin foto (se muestra una por defecto)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    null,
    left(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 50),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Reglas de seguridad al editar un perfil:
--  * el usuario (@) no se puede cambiar una vez elegido
--  * la privacidad solo se puede cambiar una vez cada 7 días (la elección inicial no cuenta)
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'username_locked';
  end if;

  if old.username is not null and new.is_private is distinct from old.is_private then
    if old.privacy_changed_at is not null and now() < old.privacy_changed_at + interval '7 days' then
      raise exception 'privacy_cooldown';
    end if;
    new.privacy_changed_at = now();
  else
    new.privacy_changed_at = old.privacy_changed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Al pasar de privado a público, las solicitudes pendientes se aceptan solas
create or replace function public.profiles_after_privacy()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted'
      where following_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;

-- ============ SEGUIDORES ============
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id, status);

alter table public.follows enable row level security;

drop policy if exists "follows_select_own" on public.follows;
create policy "follows_select_own" on public.follows
  for select to authenticated using (auth.uid() in (follower_id, following_id));

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete to authenticated using (auth.uid() in (follower_id, following_id));

drop policy if exists "follows_update_target" on public.follows;
create policy "follows_update_target" on public.follows
  for update to authenticated
  using (following_id = auth.uid()) with check (following_id = auth.uid());

-- El estado lo decide la base de datos: perfil privado = pendiente; público = aceptado
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.status = case
    when exists (select 1 from public.profiles p where p.id = new.following_id and p.is_private)
      then 'pending'
    else 'accepted'
  end;
  return new;
end;
$$;

drop trigger if exists follows_before_insert_trg on public.follows;
create trigger follows_before_insert_trg
  before insert on public.follows
  for each row execute function public.follows_before_insert();

-- Al aprobar solo se puede cambiar el estado, nunca quién sigue a quién
create or replace function public.follows_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.follower_id <> old.follower_id or new.following_id <> old.following_id then
    raise exception 'follows_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists follows_before_update_trg on public.follows;
create trigger follows_before_update_trg
  before update on public.follows
  for each row execute function public.follows_before_update();

-- (se crea aquí porque usa la tabla follows)
drop trigger if exists profiles_after_privacy_trg on public.profiles;
create trigger profiles_after_privacy_trg
  after update on public.profiles
  for each row execute function public.profiles_after_privacy();

-- ============ DATOS EXTRA PARA LAS ESTADÍSTICAS ============
alter table public.user_titles
  add column if not exists runtime_min integer,
  add column if not exists genres integer[];

-- Guardar la duración o los géneros no cuenta como "actividad reciente"
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'runtime_min' - 'genres' - 'updated_at')
     is distinct from (to_jsonb(old) - 'runtime_min' - 'genres' - 'updated_at') then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

-- ============ VISITAS AL PERFIL (solo las ve el dueño) ============
create table if not exists public.profile_visits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visits bigint not null default 0
);

alter table public.profile_visits enable row level security;

drop policy if exists "profile_visits_select_own" on public.profile_visits;
create policy "profile_visits_select_own" on public.profile_visits
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.register_visit(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user then
    insert into public.profile_visits (user_id, visits) values (p_user, 1)
    on conflict (user_id) do update set visits = public.profile_visits.visits + 1;
  end if;
end;
$$;

-- ============ FUNCIONES (respetan la privacidad) ============
-- ¿Puede quien hace la consulta ver la actividad de este perfil?
create or replace function public.can_view_profile(p_owner uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_owner
      and (
        not p.is_private
        or p.id = auth.uid()
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = p.id and f.status = 'accepted'
        )
      )
  );
$$;

-- Títulos de un perfil SIN la nota privada
create or replace function public.profile_titles(p_user uuid)
returns table (
  tmdb_id integer, media_type text, title text, poster_path text,
  status text, rating numeric, updated_at timestamptz
)
language sql
stable
security definer set search_path = public
as $$
  select t.tmdb_id, t.media_type, t.title, t.poster_path, t.status, t.rating, t.updated_at
  from public.user_titles t
  where t.user_id = p_user
    and t.status is not null
    and public.can_view_profile(p_user)
  order by t.updated_at desc;
$$;

create or replace function public.profile_stats(p_user uuid)
returns json
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_base json;
  v_eps bigint;
  v_tv_min bigint;
  v_genres json;
begin
  if not public.can_view_profile(p_user) then
    return null;
  end if;

  select json_build_object(
    'movies_seen', count(*) filter (where media_type = 'movie' and status in ('visto', 'volver_a_ver')),
    'series_seen', count(*) filter (where media_type = 'tv' and status in ('visto', 'volver_a_ver')),
    'watching',    count(*) filter (where status = 'viendo'),
    'pending',     count(*) filter (where status = 'pendiente'),
    'avg_rating',  round(avg(rating), 1),
    'movie_minutes', coalesce(sum(runtime_min) filter (
        where media_type = 'movie' and status in ('visto', 'volver_a_ver')), 0)
  ) into v_base
  from public.user_titles
  where user_id = p_user;

  select count(*) into v_eps from public.user_episodes where user_id = p_user;

  select coalesce(sum(ut.runtime_min), 0) into v_tv_min
  from public.user_episodes ue
  join public.user_titles ut
    on ut.user_id = ue.user_id and ut.tmdb_id = ue.tmdb_id and ut.media_type = 'tv'
  where ue.user_id = p_user;

  select coalesce(json_agg(json_build_object('id', g.gid, 'n', g.n) order by g.n desc), '[]'::json)
  into v_genres
  from (
    select gid, count(*) as n
    from public.user_titles ut2, unnest(ut2.genres) as gid
    where ut2.user_id = p_user and ut2.status in ('visto', 'volver_a_ver')
    group by gid
    order by n desc
    limit 5
  ) g;

  return (
    v_base::jsonb || jsonb_build_object(
      'episodes', v_eps,
      'tv_minutes', v_tv_min,
      'genres', v_genres::jsonb
    )
  )::json;
end;
$$;

-- Recuento de seguidores (público, como en Instagram)
create or replace function public.follow_counts(p_user uuid)
returns json
language sql
stable
security definer set search_path = public
as $$
  select json_build_object(
    'followers', (select count(*) from public.follows where following_id = p_user and status = 'accepted'),
    'following', (select count(*) from public.follows where follower_id = p_user and status = 'accepted')
  );
$$;

-- Lista de seguidores / seguidos (solo si puedes ver ese perfil)
create or replace function public.profile_connections(p_user uuid, p_kind text)
returns table (id uuid, username text, display_name text, avatar_url text)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.can_view_profile(p_user) then
    return;
  end if;

  if p_kind = 'followers' then
    return query
      select pr.id, pr.username, pr.display_name, pr.avatar_url
      from public.follows f join public.profiles pr on pr.id = f.follower_id
      where f.following_id = p_user and f.status = 'accepted' and pr.username is not null
      order by f.created_at desc
      limit 200;
  else
    return query
      select pr.id, pr.username, pr.display_name, pr.avatar_url
      from public.follows f join public.profiles pr on pr.id = f.following_id
      where f.follower_id = p_user and f.status = 'accepted' and pr.username is not null
      order by f.created_at desc
      limit 200;
  end if;
end;
$$;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where username = lower(p_username));
$$;

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
      starts_with(pr.username, lower(trim(p_q)))
      or position(lower(trim(p_q)) in lower(coalesce(pr.display_name, ''))) > 0
    )
  order by pr.username
  limit 12;
$$;

revoke all on function public.register_visit(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.profile_titles(uuid) from public;
revoke all on function public.profile_stats(uuid) from public;
revoke all on function public.follow_counts(uuid) from public;
revoke all on function public.profile_connections(uuid, text) from public;
revoke all on function public.username_available(text) from public;
revoke all on function public.search_people(text) from public;

grant execute on function public.register_visit(uuid) to anon, authenticated;
grant execute on function public.can_view_profile(uuid) to anon, authenticated;
grant execute on function public.profile_titles(uuid) to anon, authenticated;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
grant execute on function public.follow_counts(uuid) to anon, authenticated;
grant execute on function public.profile_connections(uuid, text) to anon, authenticated;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.search_people(text) to anon, authenticated;

-- ============ FOTOS DE PERFIL (Storage) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
