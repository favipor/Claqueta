-- Claqueta · Fase 5A (listas, notificaciones y bloqueo)
-- Ejecuta DESPUÉS de schema.sql, phase2.sql, phase3.sql y phase4.sql:
-- Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ BLOQUEOS ENTRE PERSONAS ============
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- ¿Hay un bloqueo entre estas dos personas (en cualquier dirección)? La persona bloqueada no lo puede consultar.
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Al bloquear se rompen los seguimientos entre las dos personas
create or replace function public.user_blocks_after_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;

drop trigger if exists user_blocks_after_insert_trg on public.user_blocks;
create trigger user_blocks_after_insert_trg
  after insert on public.user_blocks
  for each row execute function public.user_blocks_after_insert();

-- Una persona bloqueada no puede seguirte
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.blocked_between(new.follower_id, new.following_id) then
    raise exception 'blocked';
  end if;
  new.status = case
    when exists (select 1 from public.profiles p where p.id = new.following_id and p.is_private)
      then 'pending'
    else 'accepted'
  end;
  return new;
end;
$$;

-- ============ VISIBILIDAD (ahora respeta los bloqueos) ============
-- ¿Puede p_viewer ver contenido de p_author con esa visibilidad?
create or replace function public.can_see_for(p_viewer uuid, p_author uuid, p_visibility text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    p_viewer = p_author
    or (
      not public.blocked_between(p_viewer, p_author)
      and (
        (
          p_visibility = 'publico'
          and not exists (select 1 from public.profiles p where p.id = p_author and p.is_private)
        )
        or (
          p_visibility in ('amigos', 'publico')
          and exists (
            select 1 from public.follows f
            where f.follower_id = p_viewer and f.following_id = p_author and f.status = 'accepted'
          )
        )
      )
    );
$$;

create or replace function public.can_see_comment(p_author uuid, p_visibility text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.can_see_for(auth.uid(), p_author, p_visibility);
$$;

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
        p.id = auth.uid()
        or (
          not public.blocked_between(auth.uid(), p.id)
          and (
            not p.is_private
            or exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid() and f.following_id = p.id and f.status = 'accepted'
            )
          )
        )
      )
  );
$$;

-- Los mensajes: no se puede responder a quien te ha bloqueado
create or replace function public.comments_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  p record;
begin
  new.body = btrim(new.body);
  new.body_hash = md5(lower(regexp_replace(new.body, '\s+', ' ', 'g')));

  if tg_op = 'INSERT' then
    if (select count(*) from public.comments
        where user_id = new.user_id and created_at > now() - interval '1 minute') >= 6 then
      raise exception 'rate_limit';
    end if;

    if char_length(new.body) >= 15 and exists (
      select 1 from public.comments
      where user_id = new.user_id and body_hash = new.body_hash
        and created_at > now() - interval '10 minutes'
    ) then
      raise exception 'duplicate';
    end if;

    if new.parent_id is not null then
      select * into p from public.comments where id = new.parent_id;
      if not found or p.parent_id is not null
         or p.tmdb_id <> new.tmdb_id or p.media_type <> new.media_type then
        raise exception 'bad_parent';
      end if;
      if public.blocked_between(new.user_id, p.user_id) then
        raise exception 'blocked';
      end if;
    end if;
  else
    if new.user_id <> old.user_id or new.tmdb_id <> old.tmdb_id
       or new.media_type <> old.media_type or new.parent_id is distinct from old.parent_id
       or new.created_at <> old.created_at then
      raise exception 'immutable';
    end if;
    if new.body <> old.body then
      new.edited_at = now();
    else
      new.edited_at = old.edited_at;
    end if;
  end if;
  return new;
end;
$$;

-- ============ LISTAS PERSONALIZADAS ============
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 200),
  visibility text not null default 'publico' check (visibility in ('privado', 'amigos', 'publico')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lists_user_idx on public.lists (user_id, created_at desc);

alter table public.lists enable row level security;

drop policy if exists "lists_select" on public.lists;
create policy "lists_select" on public.lists
  for select to anon, authenticated using (public.can_see_comment(user_id, visibility));
drop policy if exists "lists_insert_own" on public.lists;
create policy "lists_insert_own" on public.lists
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "lists_update_own" on public.lists;
create policy "lists_update_own" on public.lists
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "lists_delete_own" on public.lists;
create policy "lists_delete_own" on public.lists
  for delete to authenticated using (user_id = auth.uid());

drop trigger if exists lists_updated_at on public.lists;
create trigger lists_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create or replace function public.lists_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.lists where user_id = new.user_id) >= 50 then
    raise exception 'too_many_lists';
  end if;
  return new;
end;
$$;
drop trigger if exists lists_limit_trg on public.lists;
create trigger lists_limit_trg
  before insert on public.lists
  for each row execute function public.lists_limit();

create table if not exists public.list_items (
  list_id uuid not null references public.lists(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (list_id, tmdb_id, media_type)
);
create index if not exists list_items_order_idx on public.list_items (list_id, position);

alter table public.list_items enable row level security;

-- Ves los títulos de una lista si puedes ver la lista (la política de "lists" se aplica dentro)
drop policy if exists "list_items_select" on public.list_items;
create policy "list_items_select" on public.list_items
  for select to anon, authenticated
  using (exists (select 1 from public.lists l where l.id = list_id));

drop policy if exists "list_items_insert_own" on public.list_items;
create policy "list_items_insert_own" on public.list_items
  for insert to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));
drop policy if exists "list_items_update_own" on public.list_items;
create policy "list_items_update_own" on public.list_items
  for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));
drop policy if exists "list_items_delete_own" on public.list_items;
create policy "list_items_delete_own" on public.list_items
  for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

create or replace function public.list_items_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.list_items where list_id = new.list_id) >= 500 then
    raise exception 'list_full';
  end if;
  return new;
end;
$$;
drop trigger if exists list_items_limit_trg on public.list_items;
create trigger list_items_limit_trg
  before insert on public.list_items
  for each row execute function public.list_items_limit();

-- Resumen de listas de una persona (solo las que puedes ver): nº de títulos y 4 carátulas
create or replace function public.lists_overview(p_user uuid)
returns table (
  id uuid, name text, description text, visibility text, item_count bigint, posters text[]
)
language sql
stable
as $$
  select
    l.id, l.name, l.description, l.visibility,
    (select count(*) from public.list_items i where i.list_id = l.id),
    coalesce((
      select array_agg(q.poster_path order by q.position)
      from (
        select i.poster_path, i.position from public.list_items i
        where i.list_id = l.id and i.poster_path is not null
        order by i.position limit 4
      ) q
    ), '{}')
  from public.lists l
  where l.user_id = p_user
  order by l.created_at desc;
$$;

grant execute on function public.lists_overview(uuid) to anon, authenticated;

-- ============ NOTIFICACIONES ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in
    ('follow_request', 'follow', 'follow_accepted', 'reply', 'mention', 'recommendation', 'message')),
  tmdb_id integer,
  media_type text,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Solo se puede marcar como leída (el contenido lo crean los disparadores de la base de datos)
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Seguidores: solicitud o nuevo seguidor
create or replace function public.notify_follow_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  select new.following_id, new.follower_id,
         case when new.status = 'pending' then 'follow_request' else 'follow' end
  where not exists (
    select 1 from public.notifications n
    where n.user_id = new.following_id and n.actor_id = new.follower_id
      and n.type in ('follow_request', 'follow')
      and n.created_at > now() - interval '1 day'
  );
  return null;
end;
$$;
drop trigger if exists notify_follow_insert_trg on public.follows;
create trigger notify_follow_insert_trg
  after insert on public.follows
  for each row execute function public.notify_follow_insert();

-- Solicitud aceptada: avisa a quien la envió y da por atendida la solicitud
create or replace function public.notify_follow_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, actor_id, type)
    values (new.follower_id, new.following_id, 'follow_accepted');
    update public.notifications set read_at = now()
      where user_id = new.following_id and actor_id = new.follower_id
        and type = 'follow_request' and read_at is null;
  end if;
  return null;
end;
$$;
drop trigger if exists notify_follow_update_trg on public.follows;
create trigger notify_follow_update_trg
  after update on public.follows
  for each row execute function public.notify_follow_update();

-- Si se cancela la solicitud, desaparece el aviso
create or replace function public.notify_follow_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notifications
  where user_id = old.following_id and actor_id = old.follower_id and type = 'follow_request';
  return null;
end;
$$;
drop trigger if exists notify_follow_delete_trg on public.follows;
create trigger notify_follow_delete_trg
  after delete on public.follows
  for each row execute function public.notify_follow_delete();

-- Mensajes: respuestas a un mensaje tuyo y menciones con @usuario
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  parent_author uuid;
  m text;
  target uuid;
  notified uuid[] := '{}';
begin
  if new.parent_id is not null then
    select user_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.user_id
       and public.can_see_for(parent_author, new.user_id, new.visibility) then
      insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type, comment_id)
      values (parent_author, new.user_id, 'reply', new.tmdb_id, new.media_type, new.id);
      notified := notified || parent_author;
    end if;
  end if;

  for m in
    select distinct lower((regexp_matches(new.body, '@([A-Za-z0-9_]{3,20})', 'g'))[1])
  loop
    select id into target from public.profiles where username = m;
    if target is not null and target <> new.user_id and not (target = any (notified))
       and public.can_see_for(target, new.user_id, new.visibility) then
      insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type, comment_id)
      values (target, new.user_id, 'mention', new.tmdb_id, new.media_type, new.id);
      notified := notified || target;
    end if;
  end loop;
  return null;
end;
$$;
drop trigger if exists notify_comment_trg on public.comments;
create trigger notify_comment_trg
  after insert on public.comments
  for each row execute function public.notify_comment();

-- Tiempo real para el punto rojo
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

revoke all on function public.blocked_between(uuid, uuid) from public;
revoke all on function public.can_see_for(uuid, uuid, text) from public;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;
grant execute on function public.can_see_for(uuid, uuid, text) to anon, authenticated;
