-- Claqueta · Fase 4 (conversación en cada título, denuncias y administrador)
-- Ejecuta DESPUÉS de schema.sql, phase2.sql y phase3.sql:
-- Supabase -> SQL Editor -> New query -> pega todo -> Run.
-- Es seguro ejecutarlo más de una vez.

-- ============ ADMINISTRADORES ============
-- Solo se añaden desde este editor SQL (nadie puede hacerse admin desde la web)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Tu usuario como administrador (debe haber iniciado sesión al menos una vez en la web)
insert into public.admins (user_id)
select id from auth.users where lower(email) = 'fernandoavipo@gmail.com'
on conflict do nothing;

-- ============ BLOQUEO DE COMENTARIOS ============
create table if not exists public.comment_blocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.comment_blocks enable row level security;

drop policy if exists "comment_blocks_select" on public.comment_blocks;
create policy "comment_blocks_select" on public.comment_blocks
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "comment_blocks_insert_admin" on public.comment_blocks;
create policy "comment_blocks_insert_admin" on public.comment_blocks
  for insert to authenticated with check (public.is_admin());

drop policy if exists "comment_blocks_delete_admin" on public.comment_blocks;
create policy "comment_blocks_delete_admin" on public.comment_blocks
  for delete to authenticated using (public.is_admin());

create or replace function public.is_blocked(p_user uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.comment_blocks where user_id = p_user);
$$;

-- ============ COMENTARIOS ============
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  visibility text not null default 'publico' check (visibility in ('privado', 'amigos', 'publico')),
  spoiler boolean not null default false,
  body_hash text not null default '',
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists comments_title_idx
  on public.comments (tmdb_id, media_type, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);

-- Antirrepetición: la misma persona no puede escribir el mismo texto dos veces en un título
create unique index if not exists comments_no_dupes
  on public.comments (user_id, tmdb_id, media_type, body_hash);

alter table public.comments enable row level security;

-- ¿Puede quien consulta ver este mensaje?
--  privado: solo su autor · amigos: autor + seguidores aceptados · público: todo el mundo
--  (si el perfil del autor es privado, "público" solo lo ven sus seguidores)
create or replace function public.can_see_comment(p_author uuid, p_visibility text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    auth.uid() = p_author
    or (
      p_visibility = 'publico'
      and not exists (select 1 from public.profiles p where p.id = p_author and p.is_private)
    )
    or (
      p_visibility in ('amigos', 'publico')
      and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = p_author and f.status = 'accepted'
      )
    );
$$;

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select to anon, authenticated
  using (public.can_see_comment(user_id, visibility) or public.is_admin());

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_blocked(auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.username is not null)
  );

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.is_blocked(auth.uid()));

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Reglas al escribir: texto limpio, límite de velocidad, repetidos y respuestas bien formadas
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
    -- máximo 6 mensajes por minuto
    if (select count(*) from public.comments
        where user_id = new.user_id and created_at > now() - interval '1 minute') >= 6 then
      raise exception 'rate_limit';
    end if;

    -- el mismo texto (si no es muy corto) en otro título en los últimos 10 minutos = spam
    if char_length(new.body) >= 15 and exists (
      select 1 from public.comments
      where user_id = new.user_id and body_hash = new.body_hash
        and created_at > now() - interval '10 minutes'
    ) then
      raise exception 'duplicate';
    end if;

    -- las respuestas cuelgan siempre de un mensaje principal del mismo título
    if new.parent_id is not null then
      select * into p from public.comments where id = new.parent_id;
      if not found or p.parent_id is not null
         or p.tmdb_id <> new.tmdb_id or p.media_type <> new.media_type then
        raise exception 'bad_parent';
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

drop trigger if exists comments_guard_trg on public.comments;
create trigger comments_guard_trg
  before insert or update on public.comments
  for each row execute function public.comments_guard();

-- ============ DENUNCIAS ============
create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 300),
  status text not null default 'open' check (status in ('open', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists comment_reports_status_idx on public.comment_reports (status, created_at);

alter table public.comment_reports enable row level security;

drop policy if exists "comment_reports_select" on public.comment_reports;
create policy "comment_reports_select" on public.comment_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "comment_reports_insert" on public.comment_reports;
create policy "comment_reports_insert" on public.comment_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.comments c where c.id = comment_id)
  );

drop policy if exists "comment_reports_update_admin" on public.comment_reports;
create policy "comment_reports_update_admin" on public.comment_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ TIEMPO REAL (los mensajes nuevos aparecen sin recargar) ============
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_blocked(uuid) from public;
revoke all on function public.can_see_comment(uuid, text) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_blocked(uuid) to authenticated;
grant execute on function public.can_see_comment(uuid, text) to anon, authenticated;
