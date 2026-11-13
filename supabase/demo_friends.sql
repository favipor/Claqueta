-- Amigos de ejemplo para ver «Tus amigos» en una ficha, «¿Qué vemos juntos?» y las reacciones.
-- Se borran con: select public.demo_friends_cleanup();
do $$
declare
  me uuid := public.demo_me();
  u uuid;
  r record;
begin
  for r in select * from (values
    ('lucia_demo', 'Lucía', 'visto', 9.0),
    ('marcos_demo', 'Marcos', 'visto', 7.5),
    ('sara_demo', 'Sara', 'pendiente', null),
    ('alex_demo', 'Álex', 'volver_a_ver', 8.5)
  ) as t(username, name, status, rating) loop
    u := public.demo_user(r.username, r.name);
    update public.profiles set share_activity = true, is_private = false where id = u;
    -- Dune: Parte dos
    insert into public.user_titles (user_id, tmdb_id, media_type, status, rating, title, poster_path, updated_at)
    values (u, 693134, 'movie', r.status, r.rating, 'Dune: Parte dos', '/v2NN1TMK3ifuiEyawa3ukkcSOUQ.jpg', now() - (random() * interval '20 hours'))
    on conflict (user_id, tmdb_id, media_type) do update set status = excluded.status, rating = excluded.rating;
    -- os seguís mutuamente
    insert into public.follows (follower_id, following_id, status) values (me, u, 'accepted') on conflict do nothing;
    insert into public.follows (follower_id, following_id, status) values (u, me, 'accepted') on conflict do nothing;
    update public.follows set status = 'accepted' where (follower_id = me and following_id = u) or (follower_id = u and following_id = me);
  end loop;

  -- Lucía tiene pendientes que coinciden con los tuyos (para «¿Qué vemos juntos?») y alguna más
  u := public.demo_user('lucia_demo', 'Lucía');
  insert into public.user_titles (user_id, tmdb_id, media_type, status, title, poster_path) values
    (u, 125988, 'tv', 'pendiente', 'Silo', '/s4yRu8IRcMLbfoUsO4q9Yuci4F0.jpg'),
    (u, 76331, 'tv', 'pendiente', 'Succession', '/xyHasySw0HQ4ndRWHvrpRTAsWXd.jpg'),
    (u, 49046, 'movie', 'pendiente', 'Sin novedad en el frente', '/vTfqiOZ4bZZZpIJp8sXT1UB6QS5.jpg'),
    (u, 157336, 'movie', 'pendiente', 'Interstellar', '/nCbkOyOMTEwlEV0LtCOvCnwEONA.jpg'),
    (u, 872585, 'movie', 'pendiente', 'Oppenheimer', '/ncKCQVXgk4BcQV6XbvesgZ2zLvZ.jpg')
  on conflict (user_id, tmdb_id, media_type) do update set status = excluded.status;
end $$;

create or replace function public.demo_friends_cleanup()
returns void language sql security definer set search_path = public as $$
  delete from auth.users where email in (
    'lucia_demo@claqueta-demo.invalid', 'marcos_demo@claqueta-demo.invalid',
    'sara_demo@claqueta-demo.invalid', 'alex_demo@claqueta-demo.invalid'
  );
$$;
revoke execute on function public.demo_friends_cleanup() from public, anon, authenticated;
