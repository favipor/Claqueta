import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, sessionCookieOptions } from "./remember";

export async function createClient() {
  const cookieStore = await cookies();
  const remember = cookieStore.get(REMEMBER_COOKIE)?.value !== "0";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list: { name: string; value: string; options?: Partial<CookieOptions> }[]) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, sessionCookieOptions(remember, options))
            );
          } catch {
            // Se ignora si se llama desde un Server Component; el middleware refresca la sesión.
          }
        },
      },
    }
  );
}
