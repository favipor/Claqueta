-- Claqueta · Fase 5B (mensajes privados y recomendaciones)
-- Ejecuta DESPUÉS de phase5.sql: Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ CONVERSACIONES ============
-- Una fila por pareja de personas (user_a < user_b). «pending» = solicitud de mensaje sin contestar.
create table if not exists public.dm_threads (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
alter table public.dm_threads enable row level security;
drop policy if exists "dm_threads_select" on public.dm_threads;
create policy "dm_threads_select" on public.dm_threads
  for select to authenticated using (auth.uid() in (user_a, user_b));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'recommendation')),
  body text check (body is null or char_length(body) <= 1000),
  tmdb_id integer,
  media_type text check (media_type is null or media_type in ('movie', 'tv')),
  title text,
  poster_path text,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  check (
    (kind = 'text' and body is not null and char_length(body) >= 1)
    or (kind = 'recommendation' and tmdb_id is not null and media_type is not null and title is not null)
  )
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated using (auth.uid() in (sender_id, recipient_id));
-- No hay política de escritura: los mensajes se envían solo con dm_send()

-- Hasta dónde ha leído cada persona (privado: la otra persona nunca lo ve, no hay «visto»)
create table if not exists public.dm_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, other_id)
);
alter table public.dm_reads enable row level security;
drop policy if exists "dm_reads_own" on public.dm_reads;
create policy "dm_reads_own" on public.dm_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ¿Se siguen mutuamente (seguimientos aceptados en los dos sentidos)?
create or replace function public.is_mutual(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.follows where follower_id = a and following_id = b and status = 'accepted')
     and exists (select 1 from public.follows where follower_id = b and following_id = a and status = 'accepted');
$$;

-- ============ ENVIAR ============
-- p_kind = 'text' (mensaje) o 'recommendation' (solo entre seguidores mutuos).
-- Errores: auth, self, no_username, blocked, empty, too_long, rate_limit, not_mutual, declined, request_limit
create or replace function public.dm_send(
  p_to uuid,
  p_kind text,
  p_body text,
  p_tmdb integer default null,
  p_type text default null,
  p_title text default null,
  p_poster text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  th public.dm_threads;
  mutual boolean;
  body text := nullif(btrim(coalesce(p_body, '')), '');
begin
  if me is null then raise exception 'auth'; end if;
  if me = p_to then raise exception 'self'; end if;
  if not exists (select 1 from public.profiles where id = me and username is not null)
     or not exists (select 1 from public.profiles where id = p_to and username is not null) then
    raise exception 'no_username';
  end if;
  if public.blocked_between(me, p_to) then raise exception 'blocked'; end if;

  if p_kind = 'text' then
    if body is null then raise exception 'empty'; end if;
    if char_length(body) > 1000 then raise exception 'too_long'; end if;
  elsif p_kind = 'recommendation' then
    if p_tmdb is null or p_type not in ('movie', 'tv') or p_title is null then raise exception 'empty'; end if;
    if body is not null and char_length(body) > 300 then raise exception 'too_long'; end if;
  else
    raise exception 'empty';
  end if;

  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limit';
  end if;

  mutual := public.is_mutual(me, p_to);
  if p_kind = 'recommendation' and not mutual then raise exception 'not_mutual'; end if;

  a := least(me, p_to);
  b := greatest(me, p_to);
  select * into th from public.dm_threads where user_a = a and user_b = b;

  if not found then
    insert into public.dm_threads (user_a, user_b, requester_id, status)
    values (a, b, me, case when mutual then 'accepted' else 'pending' end);
  elsif mutual then
    if th.status <> 'accepted' then
      update public.dm_threads set status = 'accepted' where user_a = a and user_b = b;
    end if;
  elsif th.status = 'declined' then
    if th.requester_id = me then raise exception 'declined'; end if;
    -- quien rechazó escribe de nuevo: se acepta la conversación
    update public.dm_threads set status = 'accepted' where user_a = a and user_b = b;
  elsif th.status = 'pending' then
    if th.requester_id = me then
      if (select count(*) from public.messages where sender_id = me and recipient_id = p_to) >= 3 then
        raise exception 'request_limit';
      end if;
    else
      -- contestar a una solicitud equivale a aceptarla
      update public.dm_threads set status = 'accepted' where user_a = a and user_b = b;
    end if;
  end if;

  insert into public.messages (sender_id, recipient_id, kind, body, tmdb_id, media_type, title, poster_path)
  values (
    me, p_to, p_kind, body,
    case when p_kind = 'recommendation' then p_tmdb end,
    case when p_kind = 'recommendation' then p_type end,
    case when p_kind = 'recommendation' then left(p_title, 300) end,
    case when p_kind = 'recommendation' then p_poster end
  );
end;
$$;

-- Aceptar o rechazar una solicitud de mensaje
create or replace function public.dm_respond(p_other uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'auth'; end if;
  update public.dm_threads
     set status = case when p_accept then 'accepted' else 'declined' end
   where user_a = least(me, p_other) and user_b = greatest(me, p_other)
     and requester_id = p_other and status = 'pending';
end;
$$;

-- Bandeja de entrada: una fila por conversación, con el último mensaje
create or replace function public.dm_inbox()
returns table (
  other_id uuid,
  other_username text,
  other_name text,
  other_avatar text,
  thread_status text,
  incoming_request boolean,
  last_kind text,
  last_body text,
  last_title text,
  last_at timestamptz,
  last_from_me boolean,
  has_unread boolean
)
language sql
stable
as $$
  select
    p.id, p.username, p.display_name, p.avatar_url,
    t.status,
    (t.status = 'pending' and t.requester_id <> auth.uid()),
    m.kind, m.body, m.title, m.created_at,
    (m.sender_id = auth.uid()),
    (m.sender_id <> auth.uid() and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz))
  from public.dm_threads t
  join public.profiles p on p.id = case when t.user_a = auth.uid() then t.user_b else t.user_a end
  join lateral (
    select x.* from public.messages x
    where (x.sender_id = auth.uid() and x.recipient_id = p.id)
       or (x.sender_id = p.id and x.recipient_id = auth.uid())
    order by x.created_at desc limit 1
  ) m on true
  left join public.dm_reads r on r.user_id = auth.uid() and r.other_id = p.id
  where auth.uid() in (t.user_a, t.user_b)
    and t.status <> 'declined'
    and not public.blocked_between(auth.uid(), p.id)
  order by m.created_at desc;
$$;

-- Personas a las que puedes recomendar (seguimiento mutuo)
create or replace function public.mutual_followers()
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.username is not null
    and public.is_mutual(auth.uid(), p.id)
    and not public.blocked_between(auth.uid(), p.id)
  order by coalesce(p.display_name, p.username);
$$;

-- ============ NOTIFICACIONES DE MENSAJES ============
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.kind = 'recommendation' then
    insert into public.notifications (user_id, actor_id, type, tmdb_id, media_type)
    values (new.recipient_id, new.sender_id, 'recommendation', new.tmdb_id, new.media_type);
  elsif not exists (
    select 1 from public.notifications n
    where n.user_id = new.recipient_id and n.actor_id = new.sender_id
      and n.type = 'message' and n.read_at is null
  ) then
    insert into public.notifications (user_id, actor_id, type)
    values (new.recipient_id, new.sender_id, 'message');
  end if;
  return null;
end;
$$;
drop trigger if exists notify_message_trg on public.messages;
create trigger notify_message_trg
  after insert on public.messages
  for each row execute function public.notify_message();

-- Tiempo real
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

revoke all on function public.is_mutual(uuid, uuid) from public;
revoke all on function public.dm_send(uuid, text, text, integer, text, text, text) from public;
revoke all on function public.dm_respond(uuid, boolean) from public;
revoke all on function public.mutual_followers() from public;
grant execute on function public.dm_send(uuid, text, text, integer, text, text, text) to authenticated;
grant execute on function public.is_mutual(uuid, uuid) to authenticated;
grant execute on function public.dm_respond(uuid, boolean) to authenticated;
grant execute on function public.dm_inbox() to authenticated;
grant execute on function public.mutual_followers() to authenticated;
