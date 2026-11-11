import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirige aquí tras iniciar sesión con Google o confirmar el email.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = await createClient();

  if (code) {
    // Si falla (p. ej. el navegador abrió este enlace dos veces y el código ya se usó) no pasa nada:
    // abajo se comprueba si ya hay sesión.
    await supabase.auth.exchangeCodeForSession(code).catch(() => null);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  // Si todavía no ha elegido su @usuario, se le lleva a elegirlo; si no, a la portada
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return NextResponse.redirect(`${origin}${profile?.username ? "/" : "/bienvenida"}`);
}
