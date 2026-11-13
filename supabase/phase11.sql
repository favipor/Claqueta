-- Fase 11: amigos en cada ficha, «¿Qué vemos juntos?», logros y rachas, reacciones a la actividad.

-- ---------- Lo que opinan tus amigos de un título ----------
-- Gente a la que sigues (aceptado) que comparte su actividad y tiene ese título marcado o puntuado.
create or replace function public.friends_on_title(p_tmdb_id integer, p_media_type text)
returns table(user_id uuid, username text, display_name text, avatar_url text, status text, rating numeric, at timestamptz)
language sql stable security definer set search_path = public as $$
  select ut.user_id, p.username, p.display_name, p.avatar_url, ut.status, ut.rating, ut.updated_at
  from public.follows f
  join public.user_titles ut on ut.user_id = f.following_id and ut.tmdb_id = p_tmdb_id and ut.media_type = p_media_type
  join public.profiles p on p.id = ut.user_id
  where f.follower_id = auth.uid() and f.status = 'accepted'
    and p.share_activity and p.username is not null
    and (ut.status is not null or ut.rating is not null)
    and not public.blocked_between(auth.uid(), ut.user_id)
  order by ut.rating desc nulls last, ut.updated_at desc
  limit 24;
$$;
grant execute on function public.friends_on_title(integer, text) to authenticated;

-- ---------- ¿Qué vemos juntos? ----------
-- Cruza tus pendientes con los de un amigo (seguimiento mutuo). «both» = los dos la queréis ver;
-- «me»/«friend» = solo uno la tiene pendiente y el otro aún no la ha visto.
create or replace function public.watch_together(p_friend uuid)
returns table(tmdb_id integer, media_type text, title text, poster_path text, who text)
language sql stable security definer set search_path = public as $$
  with ok as (
    select public.is_mutual(auth.uid(), p_friend) and not public.blocked_between(auth.uid(), p_friend) as allowed
  ),
  mine as (select * from public.user_titles where user_id = auth.uid()),
  theirs as (select * from public.user_titles where user_id = p_friend),
  seen as (
    select tmdb_id, media_type from mine where status in ('visto', 'volver_a_ver')
    union select tmdb_id, media_type from theirs where status in ('visto', 'volver_a_ver')
  ),
  pend as (
    select tmdb_id, media_type, title, poster_path, 'me'::text who from mine where status = 'pendiente'
    union all
    select tmdb_id, media_type, title, poster_path, 'friend'::text from theirs where status = 'pendiente'
  )
  select p.tmdb_id, p.media_type, max(p.title), max(p.poster_path),
         case when count(distinct p.who) = 2 then 'both' else max(p.who) end
  from pend p, ok
  where ok.allowed
    and not exists (select 1 from seen s where s.tmdb_id = p.tmdb_id and s.media_type = p.media_type)
  group by p.tmdb_id, p.media_type
  order by case when count(distinct p.who) = 2 then 0 else 1 end, max(p.title)
  limit 200;
$$;
grant execute on function public.watch_together(uuid) to authenticated;

-- ---------- Logros y rachas ----------
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, code)
);
alter table public.user_achievements enable row level security;
drop policy if exists ach_select on public.user_achievements;
create policy ach_select on public.user_achievements for select using (public.can_view_profile(user_id));
drop policy if exists ach_insert_own on public.user_achievements;
create policy ach_insert_own on public.user_achievements for insert with check (auth.uid() = user_id);
drop policy if exists ach_update_own on public.user_achievements;
create policy ach_update_own on public.user_achievements for update using (auth.uid() = user_id);

-- Números con los que se calculan los logros (solo de perfiles que puedes ver)
create or replace function public.achievement_stats(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
  days date[];
  cur int := 0;
  best int := 0;
  run int := 0;
  prev date;
  d date;
begin
  if not public.can_view_profile(p_user) then return null; end if;

  -- Días distintos con actividad (marcar títulos o capítulos), de más antiguo a más reciente
  select array_agg(x order by x) into days from (
    select distinct (updated_at at time zone 'Europe/Madrid')::date x from public.user_titles where user_id = p_user
    union
    select distinct (watched_at at time zone 'Europe/Madrid')::date from public.user_episodes where user_id = p_user
  ) s;
  if days is not null then
    foreach d in array days loop
      if prev is not null and d = prev + 1 then run := run + 1; else run := 1; end if;
      best := greatest(best, run);
      prev := d;
    end loop;
    -- La racha actual sigue viva si la última actividad fue hoy o ayer
    if prev >= (now() at time zone 'Europe/Madrid')::date - 1 then cur := run; end if;
  end if;

  select jsonb_build_object(
    'movies',   (select count(*) from public.user_titles where user_id = p_user and media_type = 'movie' and status in ('visto','volver_a_ver')),
    'series',   (select count(*) from public.user_titles where user_id = p_user and media_type = 'tv' and status in ('visto','volver_a_ver')),
    'episodes', (select count(*) from public.user_episodes where user_id = p_user),
    'ratings',  (select count(*) from public.user_titles where user_id = p_user and rating is not null),
    'tens',     (select count(*) from public.user_titles where user_id = p_user and rating = 10),
    'pending',  (select count(*) from public.user_titles where user_id = p_user and status = 'pendiente'),
    'rewatch',  (select count(*) from public.user_titles where user_id = p_user and status = 'volver_a_ver'),
    'genres',   (select count(distinct g) from public.user_titles, unnest(genres) g where user_id = p_user and status in ('visto','volver_a_ver')),
    'hours',    (select coalesce(sum(runtime_min), 0) / 60 from public.user_titles where user_id = p_user and status in ('visto','volver_a_ver')),
    'lists',    (select count(*) from public.lists where user_id = p_user),
    'comments', (select count(*) from public.comments where user_id = p_user),
    'following',(select count(*) from public.follows where follower_id = p_user and status = 'accepted'),
    'followers',(select count(*) from public.follows where following_id = p_user and status = 'accepted'),
    'best_day_eps', (select coalesce(max(c), 0) from (select count(*) c from public.user_episodes where user_id = p_user group by (watched_at at time zone 'Europe/Madrid')::date) s),
    'streak', cur,
    'best_streak', best
  ) into r;
  return r;
end;
$$;
grant execute on function public.achievement_stats(uuid) to authenticated, anon;

-- ---------- Reacciones a la actividad de tus amigos ----------
create table if not exists public.activity_reactions (
  reactor_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  emoji text not null check (emoji in ('👍','🔥','😂','😮','❤️')),
  created_at timestamptz not null default now(),
  primary key (reactor_id, owner_id, tmdb_id, media_type)
);
create index if not exists activity_reactions_owner on public.activity_reactions (owner_id, tmdb_id, media_type);
alter table public.activity_reactions enable row level security;
drop policy if exists react_select on public.activity_reactions;
create policy react_select on public.activity_reactions for select
  using (reactor_id = auth.uid() or owner_id = auth.uid() or public.can_view_profile(owner_id));
drop policy if exists react_insert on public.activity_reactions;
create policy react_insert on public.activity_reactions for insert
  with check (reactor_id = auth.uid() and reactor_id <> owner_id and public.can_view_profile(owner_id) and not public.blocked_between(reactor_id, owner_id));
drop policy if exists react_update on public.activity_reactions;
create policy react_update on public.activity_reactions for update using (reactor_id = auth.uid());
drop policy if exists react_delete on public.activity_reactions;
create policy react_delete on public.activity_reactions for delete using (reactor_id = auth.uid());

-- Aviso al dueño cuando alguien reacciona (una vez por título y persona)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'follow_request','follow','follow_accepted','reply','mention','recommendation','message','new_user','new_episode','app_error','reaction'
]));
create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.notifications
    where user_id = new.owner_id and actor_id = new.reactor_id and type = 'reaction'
      and tmdb_id = new.tmdb_id and media_type = new.media_type
  ) then
    insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type)
    values (new.owner_id, new.reactor_id, 'reaction', new.tmdb_id, new.media_type);
  end if;
  return new;
end; $$;
drop trigger if exists activity_reactions_notify on public.activity_reactions;
create trigger activity_reactions_notify after insert on public.activity_reactions
  for each row execute function public.notify_reaction();
