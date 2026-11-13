-- Fase 12: «match» de pendientes, planes de peli con fecha, compatibilidad entre amigos,
-- ranking semanal entre amigos y retos de grupo. Respeta «mostrar mi actividad» (share_activity).

-- ---------- Tipos de aviso nuevos ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'follow_request','follow','follow_accepted','reply','mention','recommendation','message','new_user','new_episode','app_error','reaction',
  'match','plan_invite','plan_accepted','plan_declined'
]));

-- ---------- Match: los dos queréis ver lo mismo ----------
-- Al marcar algo como pendiente, si un amigo mutuo ya lo tenía pendiente, os llega un aviso a los dos.
create or replace function public.notify_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if new.status is distinct from 'pendiente' or (tg_op = 'UPDATE' and old.status is not distinct from 'pendiente') then
    return new;
  end if;
  if not coalesce((select share_activity from public.profiles where id = new.user_id), false) then
    return new;
  end if;
  for f in
    select ut.user_id
    from public.user_titles ut
    join public.profiles p on p.id = ut.user_id and p.share_activity
    where ut.tmdb_id = new.tmdb_id and ut.media_type = new.media_type and ut.status = 'pendiente'
      and ut.user_id <> new.user_id
      and public.is_mutual(new.user_id, ut.user_id)
      and not public.blocked_between(new.user_id, ut.user_id)
    limit 20
  loop
    insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type)
    select x.u, x.a, 'match', new.tmdb_id, new.media_type
    from (values (new.user_id, f.user_id), (f.user_id, new.user_id)) as x(u, a)
    where not exists (
      select 1 from public.notifications n
      where n.user_id = x.u and n.actor_id = x.a and n.type = 'match' and n.tmdb_id = new.tmdb_id and n.media_type = new.media_type
    );
  end loop;
  return new;
end; $$;
drop trigger if exists user_titles_match on public.user_titles;
create trigger user_titles_match after insert or update of status on public.user_titles
  for each row execute function public.notify_match();

-- ---------- Planes de peli con fecha ----------
create table if not exists public.watch_plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  plan_date date not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  check (creator_id <> invitee_id)
);
create index if not exists watch_plans_users on public.watch_plans (creator_id, invitee_id, plan_date);
alter table public.watch_plans enable row level security;
drop policy if exists plans_select on public.watch_plans;
create policy plans_select on public.watch_plans for select using (auth.uid() in (creator_id, invitee_id));
drop policy if exists plans_insert on public.watch_plans;
create policy plans_insert on public.watch_plans for insert
  with check (creator_id = auth.uid() and public.is_mutual(creator_id, invitee_id) and not public.blocked_between(creator_id, invitee_id) and plan_date >= current_date - 1);
drop policy if exists plans_update on public.watch_plans;
create policy plans_update on public.watch_plans for update using (auth.uid() in (creator_id, invitee_id));

-- Solo el invitado acepta o rechaza; solo quien lo propuso lo cancela
create or replace function public.watch_plans_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator_id <> old.creator_id or new.invitee_id <> old.invitee_id or new.tmdb_id <> old.tmdb_id then
    raise exception 'no se puede cambiar';
  end if;
  if new.status <> old.status then
    if new.status in ('accepted','declined') and auth.uid() <> old.invitee_id then raise exception 'solo el invitado'; end if;
    if new.status = 'cancelled' and auth.uid() <> old.creator_id then raise exception 'solo quien lo propuso'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists watch_plans_guard on public.watch_plans;
create trigger watch_plans_guard before update on public.watch_plans for each row execute function public.watch_plans_guard();

create or replace function public.notify_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type) values (new.invitee_id, new.creator_id, 'plan_invite', new.tmdb_id, new.media_type);
  elsif new.status <> old.status and new.status in ('accepted','declined') then
    insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type)
    values (new.creator_id, new.invitee_id, case when new.status = 'accepted' then 'plan_accepted' else 'plan_declined' end, new.tmdb_id, new.media_type);
  end if;
  return new;
end; $$;
drop trigger if exists watch_plans_notify on public.watch_plans;
create trigger watch_plans_notify after insert or update on public.watch_plans for each row execute function public.notify_plan();

-- ---------- Compatibilidad con un amigo ----------
-- Solo entre amigos mutuos y si el otro comparte su actividad.
create or replace function public.friend_compat(p_friend uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r jsonb;
begin
  if me is null or not public.is_mutual(me, p_friend) or public.blocked_between(me, p_friend)
     or not coalesce((select share_activity from public.profiles where id = p_friend), false) then
    return null;
  end if;
  with a as (select * from public.user_titles where user_id = me and status is not null),
       b as (select * from public.user_titles where user_id = p_friend and status is not null),
       both_ as (select a.tmdb_id, a.media_type, a.title, a.poster_path, a.rating ra, b.rating rb from a join b using (tmdb_id, media_type)),
       rated as (select * from both_ where ra is not null and rb is not null),
       ga as (select g, count(*) c from a, unnest(coalesce(genres, '{}'::int[])) g group by g),
       gb as (select g, count(*) c from b, unnest(coalesce(genres, '{}'::int[])) g group by g)
  select jsonb_build_object(
    'common', (select count(*) from both_),
    'rated', (select count(*) from rated),
    'percent', least(99, greatest(1, round(
        coalesce((select 100 - avg(abs(ra - rb)) * 10 from rated), 50) * 0.6
      + coalesce(100.0 * (select count(*) from both_) / nullif(least((select count(*) from a), (select count(*) from b)), 0), 0) * 0.4
    )))::int,
    'genres', coalesce((select jsonb_agg(g order by s desc) from (select ga.g, least(ga.c, gb.c) s from ga join gb using (g) order by s desc limit 3) x), '[]'::jsonb),
    'best', (select jsonb_build_object('tmdb_id', tmdb_id, 'media_type', media_type, 'title', title, 'poster_path', poster_path, 'me', ra, 'them', rb)
             from rated where ra >= 7 and rb >= 7 order by ra + rb desc limit 1),
    'clash', (select jsonb_build_object('tmdb_id', tmdb_id, 'media_type', media_type, 'title', title, 'poster_path', poster_path, 'me', ra, 'them', rb)
              from rated where abs(ra - rb) >= 3 order by abs(ra - rb) desc limit 1)
  ) into r;
  return r;
end; $$;
grant execute on function public.friend_compat(uuid) to authenticated;

-- ---------- Ranking semanal entre amigos ----------
-- Tú y la gente a la que sigues, solo quienes comparten su actividad (tú tampoco sales si la ocultas).
create or replace function public.friends_ranking()
returns table(user_id uuid, username text, display_name text, avatar_url text, episodes int, movies int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with wk as (select date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as since),
  people as (
    select p.id from public.profiles p where p.id = auth.uid() and p.share_activity
    union
    select f.following_id from public.follows f join public.profiles p on p.id = f.following_id
    where f.follower_id = auth.uid() and f.status = 'accepted' and p.share_activity and not public.blocked_between(auth.uid(), f.following_id)
  )
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*) from public.user_episodes e, wk where e.user_id = p.id and e.watched_at >= wk.since)::int,
    (select count(*) from public.user_titles t, wk where t.user_id = p.id and t.media_type = 'movie' and t.status in ('visto','volver_a_ver')
       and coalesce(t.watched_on::timestamptz, t.updated_at) >= wk.since)::int,
    p.id = auth.uid()
  from people x join public.profiles p on p.id = x.id
  where p.username is not null
  order by 5 + 6 desc, p.username
  limit 20;
$$;
grant execute on function public.friends_ranking() to authenticated;

-- ---------- Retos de grupo ----------
create table if not exists public.challenge_members (
  code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.challenge_members enable row level security;
drop policy if exists ch_select on public.challenge_members;
create policy ch_select on public.challenge_members for select using (user_id = auth.uid() or public.can_view_profile(user_id));
drop policy if exists ch_insert on public.challenge_members;
create policy ch_insert on public.challenge_members for insert with check (user_id = auth.uid());
drop policy if exists ch_delete on public.challenge_members;
create policy ch_delete on public.challenge_members for delete using (user_id = auth.uid());

-- Progreso de un reto: tú y la gente que sigues que se ha apuntado (y comparte su actividad)
create or replace function public.challenge_progress(p_code text, p_ids integer[], p_types text[])
returns table(user_id uuid, username text, display_name text, avatar_url text, seen int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with items as (select unnest(p_ids) tmdb_id, unnest(p_types) media_type),
  members as (
    select m.user_id from public.challenge_members m
    where m.code = p_code and (
      m.user_id = auth.uid()
      or exists (select 1 from public.follows f join public.profiles p on p.id = f.following_id
                 where f.follower_id = auth.uid() and f.following_id = m.user_id and f.status = 'accepted' and p.share_activity
                   and not public.blocked_between(auth.uid(), m.user_id))
    )
  )
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*) from public.user_titles t join items i on i.tmdb_id = t.tmdb_id and i.media_type = t.media_type
     where t.user_id = p.id and t.status in ('visto','volver_a_ver'))::int,
    p.id = auth.uid()
  from members x join public.profiles p on p.id = x.user_id
  order by 5 desc, p.username;
$$;
grant execute on function public.challenge_progress(text, integer[], text[]) to authenticated;

-- Cuántos amigos tuyos están en cada reto (para las tarjetas de la lista de retos)
create or replace function public.challenge_counts()
returns table(code text, members int, me boolean)
language sql stable security definer set search_path = public as $$
  select m.code, count(*)::int, bool_or(m.user_id = auth.uid())
  from public.challenge_members m
  where m.user_id = auth.uid()
     or exists (select 1 from public.follows f join public.profiles p on p.id = f.following_id
                where f.follower_id = auth.uid() and f.following_id = m.user_id and f.status = 'accepted' and p.share_activity)
  group by m.code;
$$;
grant execute on function public.challenge_counts() to authenticated;
