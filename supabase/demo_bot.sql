-- Claqueta · Usuarios de prueba (SOLO PARA PROBAR, bórralos después con:  select demo_cleanup();)
-- Ejecuta DESPUÉS de phase5b.sql, en Supabase -> SQL Editor. Puedes ejecutarlo varias veces:
-- cada vez te llegan mensajes, una recomendación, una respuesta y una mención nuevos.
--
-- Crea dos personas falsas:
--   @claqueta_bot    -> te sigue y la sigues (seguimiento mutuo): te escribe, te recomienda y te menciona.
--   @claqueta_extra  -> no os seguís: te manda una «solicitud de mensaje».
--
-- Después, para que el bot te conteste en el chat cuando tú le escribas:
--   select demo_bot_say('Hola, esto es una respuesta del bot');
--   select demo_extra_say('Otro mensaje desde la solicitud');

create or replace function public.demo_user(p_username text, p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid;
  mail text := p_username || '@claqueta-demo.invalid';
begin
  select id into uid from auth.users where email = mail;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_name), now(), now(), '', '', '', ''
    );
  end if;
  update public.profiles set username = p_username, display_name = p_name
   where id = uid and username is null;
  return uid;
end;
$$;

-- Envía un mensaje como otra persona usando la misma función que usa la web (así se prueban todas las reglas)
create or replace function public.demo_send_as(p_from uuid, p_to uuid, p_kind text, p_body text,
  p_tmdb integer default null, p_type text default null, p_title text default null, p_poster text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform set_config('request.jwt.claim.sub', p_from::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_from, 'role', 'authenticated')::text, true);
  perform public.dm_send(p_to, p_kind, p_body, p_tmdb, p_type, p_title, p_poster);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function public.demo_me()
returns uuid
language sql
stable
security definer set search_path = public
as $$ select id from auth.users where email = 'fernandoavipo@gmail.com'; $$;

create or replace function public.demo_bot_say(p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.demo_send_as(public.demo_user('claqueta_bot', 'Claqueta Bot'), public.demo_me(), 'text', p_text);
end; $$;

create or replace function public.demo_extra_say(p_text text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.demo_send_as(public.demo_user('claqueta_extra', 'Persona Extraña'), public.demo_me(), 'text', p_text);
end; $$;

create or replace function public.demo_cleanup()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where email in ('claqueta_bot@claqueta-demo.invalid', 'claqueta_extra@claqueta-demo.invalid');
end; $$;

-- Seguridad: estas funciones solo se pueden usar desde este editor, nunca desde la web
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'demo\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- ---- Ejecución ----
do $$
declare
  me uuid := public.demo_me();
  bot uuid;
  extra uuid;
  my_comment record;
  stamp text := to_char(now(), 'HH24:MI:SS');
  my_username text;
begin
  if me is null then
    raise exception 'No encuentro tu usuario fernandoavipo@gmail.com';
  end if;
  select username into my_username from public.profiles where id = me;
  if my_username is null then
    raise exception 'Primero elige tu nombre de usuario en la web (pantalla de bienvenida).';
  end if;

  bot := public.demo_user('claqueta_bot', 'Claqueta Bot');
  extra := public.demo_user('claqueta_extra', 'Persona Extraña');

  -- seguimiento mutuo con el bot
  insert into public.follows (follower_id, following_id) values (bot, me), (me, bot)
    on conflict do nothing;

  -- mensaje privado + recomendación del bot (seguidor mutuo)
  perform public.demo_send_as(bot, me, 'text',
    '¡Hola! Soy el bot de pruebas de Claqueta. Respóndeme desde aquí y yo te contesto con: select demo_bot_say(''...'');');
  perform public.demo_send_as(bot, me, 'recommendation', 'Si no la has visto, no sé a qué esperas 😄',
    603, 'movie', 'Matrix', '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg');

  -- solicitud de mensaje de alguien a quien no sigues
  begin
    perform public.demo_send_as(extra, me, 'text', 'Hola, ¿me aceptas la solicitud? (' || stamp || ')');
  exception when others then
    null; -- límite de 3 mensajes mientras la solicitud sigue sin contestar: es lo esperado
  end;

  -- respuesta a tu último mensaje en una conversación, o mención si aún no has escrito ninguno
  select * into my_comment from public.comments
    where user_id = me and parent_id is null order by created_at desc limit 1;
  if found then
    insert into public.comments (user_id, tmdb_id, media_type, parent_id, body)
    values (bot, my_comment.tmdb_id, my_comment.media_type, my_comment.id,
            '@' || my_username || ' totalmente de acuerdo contigo (' || stamp || ')');
  end if;
  insert into public.comments (user_id, tmdb_id, media_type, body)
  values (bot, 603, 'movie', 'Qué grande es esta peli, ¿verdad @' || my_username || '? (' || stamp || ')');
end $$;
