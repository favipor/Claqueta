-- Claqueta · Fase 6 (endurecimiento de seguridad)
-- Ejecuta DESPUÉS de phase5b.sql (y después de demo_bot.sql si lo usaste).
-- Es seguro ejecutarlo más de una vez.

-- 1) Las funciones de prueba (demo_*) NO deben poder llamarse desde la web: solo desde el editor SQL.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'demo\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- 2) La tabla de administradores no es accesible desde la API en absoluto
--    (is_admin() la consulta por dentro; nadie puede leerla ni modificarla desde la web).
revoke all on table public.admins from anon, authenticated;

-- 3) Las funciones internas de mensajes y bloqueos solo las pueden llamar personas con sesión iniciada
revoke execute on function public.blocked_between(uuid, uuid) from anon;
revoke execute on function public.is_mutual(uuid, uuid) from anon;
revoke execute on function public.dm_inbox() from anon;
