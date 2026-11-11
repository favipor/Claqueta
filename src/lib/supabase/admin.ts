import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con permisos de administrador (salta la seguridad por filas). SOLO para el servidor:
// envío de pushes y tarea diaria de capítulos. Devuelve null si falta la clave.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
