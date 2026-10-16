-- Claqueta · Fase 1
-- Pega este script entero en Supabase -> SQL Editor -> New query -> Run.

-- ============ PERFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquiera con sesión puede ver perfiles básicos (se afinará en la fase de red social)
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Al registrarse un usuario se crea su perfil automáticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ SEGUIMIENTO DE TÍTULOS ============
create table if not exists public.user_titles (
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  status text check (status in ('pendiente', 'viendo', 'visto', 'volver_a_ver')),
  rating numeric(3,1) check (rating >= 0 and rating <= 10 and (rating * 2) = floor(rating * 2)),
  private_note text,
  title text not null,
  poster_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index if not exists user_titles_user_status_idx on public.user_titles (user_id, status);

alter table public.user_titles enable row level security;

-- Cada persona solo ve y toca lo suyo (incluida su nota privada)
create policy "user_titles_select_own" on public.user_titles
  for select to authenticated using (auth.uid() = user_id);
create policy "user_titles_insert_own" on public.user_titles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_titles_update_own" on public.user_titles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_titles_delete_own" on public.user_titles
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_titles_updated_at on public.user_titles;
create trigger user_titles_updated_at
  before update on public.user_titles
  for each row execute function public.set_updated_at();

-- ============ NOTA MEDIA DE LA COMUNIDAD ============
-- Devuelve solo la media y el número de votos, nunca quién votó ni las notas privadas.
create or replace function public.community_rating(p_tmdb_id integer, p_media_type text)
returns table (average numeric, votes bigint)
language sql
stable
security definer set search_path = public
as $$
  select round(avg(rating), 1), count(rating)
  from public.user_titles
  where tmdb_id = p_tmdb_id and media_type = p_media_type and rating is not null;
$$;

revoke all on function public.community_rating(integer, text) from public;
grant execute on function public.community_rating(integer, text) to authenticated;
