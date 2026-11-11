import type { CookieOptions } from "@supabase/ssr";

// «Mantener la sesión iniciada en este dispositivo».
// Por defecto la sesión se guarda (cookies de larga duración). Si se desmarca, se guarda la cookie
// «claq_remember=0» y las cookies de sesión pasan a ser temporales: se borran al cerrar el navegador.
export const REMEMBER_COOKIE = "claq_remember";

export function sessionCookieOptions(remember: boolean, options?: Partial<CookieOptions>): Partial<CookieOptions> | undefined {
  if (remember || !options) return options;
  // Sin maxAge ni expires el navegador la trata como cookie de sesión (salvo al borrarla: maxAge 0)
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
