-- Claqueta · Fase 2 (series por temporada y capítulo)
-- Pega este script entero en Supabase -> SQL Editor -> New query -> Run.
-- Es seguro ejecutarlo una sola vez; no toca lo que ya tienes de la Fase 1.

-- ============ ESTADO DE CADA TEMPORADA ============
-- "Pendiente" = no hay fila. Solo se guardan "viendo" y "visto".
create table if not exists public.user_seasons (
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  season_number integer not null check (season_number >= 0),
  status text not null check (status in ('viendo', 'visto')),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, season_number)
);

alter table public.user_seasons enable row level security;

create policy "user_seasons_select_own" on public.user_seasons
  for select to authenticated using (auth.uid() = user_id);
create policy "user_seasons_insert_own" on public.user_seasons
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_seasons_update_own" on public.user_seasons
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_seasons_delete_own" on public.user_seasons
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists user_seasons_updated_at on public.user_seasons;
create trigger user_seasons_updated_at
  before update on public.user_seasons
  for each row execute function public.set_updated_at();

-- ============ CAPÍTULOS VISTOS ============
-- Una fila = capítulo visto. Sin fila = pendiente.
create table if not exists public.user_episodes (
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  season_number integer not null check (season_number >= 0),
  episode_number integer not null check (episode_number >= 0),
  watched_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, season_number, episode_number)
);

alter table public.user_episodes enable row level security;

create policy "user_episodes_select_own" on public.user_episodes
  for select to authenticated using (auth.uid() = user_id);
create policy "user_episodes_insert_own" on public.user_episodes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "user_episodes_update_own" on public.user_episodes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_episodes_delete_own" on public.user_episodes
  for delete to authenticated using (auth.uid() = user_id);
