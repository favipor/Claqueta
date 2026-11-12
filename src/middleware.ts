import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, sessionCookieOptions } from "@/lib/supabase/remember";

// Mantiene la sesión de Supabase al día en cada petición.
export async function middleware(request: NextRequest) {
  // La dirección oficial es miclaqueta.com: quien entre por la antigua de Vercel se redirige
  if (request.headers.get("host") === "claqueta-iota.vercel.app") {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://miclaqueta.com");
    return NextResponse.redirect(url, 308);
  }

  // Si Supabase devuelve el inicio de sesión a otra página (p. ej. «/?code=...» porque esa dirección
  // no está en su lista permitida), se reenvía a /auth/callback para completar el login igualmente.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback" && /^[0-9a-f-]{20,}$/i.test(code)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = `?code=${encodeURIComponent(code)}`;
    return NextResponse.redirect(url);
  }

  // Enlace de «recuperar contraseña» que llega a otra página: se lleva a /restablecer
  const sp = request.nextUrl.searchParams;
  if (sp.get("token_hash") && sp.get("type") === "recovery" && request.nextUrl.pathname !== "/restablecer") {
    const url = request.nextUrl.clone();
    url.pathname = "/restablecer";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options?: Partial<CookieOptions> }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, sessionCookieOptions(remember, options))
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|api/push|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
