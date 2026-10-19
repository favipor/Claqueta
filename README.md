# Claqueta · Fase 1

Web para llevar el seguimiento de películas y series (datos de TMDB), con login de Google/email, estados, nota de 0 a 10 (de 0,5 en 0,5), notas privadas y filtros.

## 1. Poner en marcha en tu ordenador

1. Descomprime la carpeta `claqueta` y ábrela en una terminal (en Windows: clic derecho en la carpeta → *Abrir en Terminal*).
2. Instala las dependencias:
   ```
   npm install
   ```
3. Copia `.env.example` como `.env.local` y rellena los valores:
   - `TMDB_READ_TOKEN`: tu *API Read Access Token* (el largo) de TMDB.
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: en Supabase, *Project Settings → API* (Project URL y clave *anon public*).
   - `NEXT_PUBLIC_SITE_URL`: déjalo en `http://localhost:3000` por ahora.
4. En Supabase abre **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y pulsa **Run**.
   Después, en otra query nueva, haz lo mismo con `supabase/phase2.sql` (seguimiento de series por temporada y capítulo)
   luego con `supabase/phase3.sql` (perfiles, seguidores, privacidad y fotos de perfil)
   luego con `supabase/phase4.sql` (conversaciones, denuncias y administrador)
   luego con `supabase/phase5.sql` (listas, notificaciones y bloqueo de personas)
   y por último con `supabase/phase5b.sql` (mensajes privados y recomendaciones).
   y `supabase/phase7.sql` (descubrir gente afín y panel de administración de usuarios).
   Opcional para probar: `supabase/demo_bot.sql` crea dos personas falsas (se borran con `select demo_cleanup();`).
5. Arranca la web:
   ```
   npm run dev
   ```
   y abre http://localhost:3000

Con eso ya funciona el registro por **email y contraseña**. Para que el botón de Google funcione hay que configurarlo (paso 3).

## 2. Ajustes de Supabase para el login

En Supabase → **Authentication → URL Configuration**:
- *Site URL*: `http://localhost:3000` (cuando publiques: `https://claqueta-iota.vercel.app`).
- *Redirect URLs*: añade `http://localhost:3000/auth/callback` y `https://claqueta-iota.vercel.app/auth/callback`.

Para pruebas rápidas puedes desactivar *Confirm email* en **Authentication → Providers → Email**; actívalo de nuevo antes de abrir la web al público.

## 3. Login con Google (lo haremos juntos)

Necesita crear unas credenciales OAuth en Google Cloud y pegarlas en Supabase (*Authentication → Providers → Google*). Te guío paso a paso cuando llegues aquí.

## 4. Publicar en Vercel

1. Sube esta carpeta al repositorio `claqueta` de GitHub.
2. En Vercel, en el proyecto → **Settings → Environment Variables**, añade las mismas 4 variables del `.env.local` (con `NEXT_PUBLIC_SITE_URL` = tu dirección de Vercel).
3. Cada vez que subas cambios a GitHub, Vercel publica solo.

## Qué incluye esta fase

- Inicio con tendencias y buscador (películas y series, también anime y documentales).
- Ficha con sinopsis, reparto, tráiler, plataformas donde verla, nota TMDB y nota de la comunidad.
- Estados: Pendiente, Viendo, Visto y Volver a ver.
- Nota personal de 0 a 10 (pasos de 0,5), modificable siempre.
- Notas privadas por título (solo las ve su dueño, protegidas en la base de datos).
- «Mi lista» con filtros por estado y tipo.
- Tema claro/oscuro, español/inglés, menú que se compacta al bajar, botón de subir arriba y animaciones (respetan «reducir movimiento»).

## Pendiente para próximas fases

Seguimiento por temporada/capítulo, perfiles y seguidores, comentarios con spoiler, listas, recomendar, notificaciones y panel de accesibilidad completo.

## Seguridad (fase 6)

Ejecuta también `supabase/phase6.sql` (cierra el acceso a la tabla de administradores y a las funciones de prueba).
Nadie puede hacerse administrador desde la web: solo se añade con SQL en el panel de Supabase.
