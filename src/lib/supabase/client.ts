import { createBrowserClient } from "@supabase/ssr";
import { REMEMBER_COOKIE } from "./remember";

export function createClient() {
  // Si la persona eligió no mantener la sesión, las cookies se borran al cerrar el navegador.
  // En ese caso se crea un cliente propio (no el compartido) para que use esas cookies temporales.
  const remember = typeof document === "undefined" || !document.cookie.split("; ").includes(`${REMEMBER_COOKIE}=0`);
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    remember ? undefined : { cookieOptions: { maxAge: undefined }, isSingleton: false }
  );
}
