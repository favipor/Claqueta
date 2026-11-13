-- Fase 13: banner personalizable de la tarjeta de perfil
-- «g:<clave>» = degradado de color · «b:<ruta>» = imagen de fondo de una peli o serie (TMDB)
alter table public.profiles add column if not exists banner text;
alter table public.profiles drop constraint if exists profiles_banner_chk;
alter table public.profiles add constraint profiles_banner_chk
  check (banner is null or banner ~ '^g:[a-z]{2,16}$' or banner ~ '^b:/[A-Za-z0-9_-]{6,64}\.(jpg|png)$');
