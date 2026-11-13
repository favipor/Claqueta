-- Datos de ejemplo de la fase 12 (planes, retos, ranking y match) con los amigos demo.
-- Se borran junto con los usuarios demo: select public.demo_friends_cleanup();
do $$
declare
  me uuid := public.demo_me();
  lucia uuid := (select id from public.profiles where username = 'lucia_demo');
  marcos uuid := (select id from public.profiles where username = 'marcos_demo');
  sara uuid := (select id from public.profiles where username = 'sara_demo');
  alex uuid := (select id from public.profiles where username = 'alex_demo');
begin
  -- Planes: Lucía te invita (pendiente) y otro con Marcos ya confirmado
  delete from public.watch_plans where creator_id in (lucia, marcos) or invitee_id in (lucia, marcos);
  insert into public.watch_plans (creator_id, invitee_id, tmdb_id, media_type, title, poster_path, plan_date, status) values
    (lucia, me, 125988, 'tv', 'Silo', '/s4yRu8IRcMLbfoUsO4q9Yuci4F0.jpg', current_date + 2, 'pending'),
    (me, marcos, 157336, 'movie', 'Interstellar', '/nCbkOyOMTEwlEV0LtCOvCnwEONA.jpg', current_date + 5, 'accepted');

  -- Retos: Lucía, Marcos y Álex se apuntan a Harry Potter; Sara a Star Wars
  insert into public.challenge_members (code, user_id) values
    ('harry-potter', lucia), ('harry-potter', marcos), ('harry-potter', alex), ('star-wars', sara)
  on conflict do nothing;
  insert into public.user_titles (user_id, tmdb_id, media_type, status, title) values
    (lucia, 671, 'movie', 'visto', 'Harry Potter y la piedra filosofal'),
    (lucia, 672, 'movie', 'visto', 'Harry Potter y la cámara secreta'),
    (lucia, 673, 'movie', 'visto', 'Harry Potter y el prisionero de Azkaban'),
    (lucia, 674, 'movie', 'visto', 'Harry Potter y el cáliz de fuego'),
    (lucia, 675, 'movie', 'visto', 'Harry Potter y la Orden del Fénix'),
    (marcos, 671, 'movie', 'visto', 'Harry Potter y la piedra filosofal'),
    (marcos, 672, 'movie', 'visto', 'Harry Potter y la cámara secreta'),
    (alex, 671, 'movie', 'visto', 'Harry Potter y la piedra filosofal'),
    (sara, 11, 'movie', 'visto', 'La guerra de las galaxias')
  on conflict (user_id, tmdb_id, media_type) do nothing;

  -- Ranking: capítulos vistos esta semana
  insert into public.user_episodes (user_id, tmdb_id, season_number, episode_number, watched_at)
  select lucia, 66732, 1, n, now() - (n || ' hours')::interval from generate_series(1, 7) n
  on conflict do nothing;
  insert into public.user_episodes (user_id, tmdb_id, season_number, episode_number, watched_at)
  select marcos, 1396, 1, n, now() - (n || ' hours')::interval from generate_series(1, 4) n
  on conflict do nothing;
  insert into public.user_episodes (user_id, tmdb_id, season_number, episode_number, watched_at)
  select alex, 100088, 1, n, now() - (n || ' hours')::interval from generate_series(1, 2) n
  on conflict do nothing;

  -- Match: Lucía vuelve a marcar Succession como pendiente (tú también la tienes) → aviso a los dos
  delete from public.notifications where type = 'match' and actor_id = lucia;
  update public.user_titles set status = 'visto' where user_id = lucia and tmdb_id = 76331 and media_type = 'tv';
  update public.user_titles set status = 'pendiente' where user_id = lucia and tmdb_id = 76331 and media_type = 'tv';
end $$;
do $$
declare
  me uuid := public.demo_me();
  lucia uuid := (select id from public.profiles where username = 'lucia_demo');
  r record;
  k int := 0;
begin
  -- 6 títulos que tú has puntuado alto: Lucía también (favorita común); 1 que puntuaste alto y ella muy bajo (discrepancia)
  for r in select tmdb_id, media_type, title, poster_path, rating, genres from public.user_titles
           where user_id = me and rating >= 8 and status in ('visto','volver_a_ver') order by rating desc, updated_at desc limit 7 loop
    k := k + 1;
    insert into public.user_titles (user_id, tmdb_id, media_type, status, rating, title, poster_path, genres, updated_at)
    values (lucia, r.tmdb_id, r.media_type, 'visto', case when k = 7 then 2.5 else least(10, r.rating) end, r.title, r.poster_path, r.genres, now() - interval '9 days')
    on conflict (user_id, tmdb_id, media_type) do update set status = 'visto', rating = excluded.rating, genres = excluded.genres;
  end loop;
end $$;
