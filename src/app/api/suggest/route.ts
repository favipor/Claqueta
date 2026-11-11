import { NextResponse } from "next/server";
import { searchTitles } from "@/lib/tmdb";
import { getLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Sugerencias mientras se escribe en el buscador: títulos de TMDB y personas de Claqueta.
export async function GET(request: Request) {
  // Como mucho 40 búsquedas cada 20 s por persona (escribiendo normal no se llega nunca)
  if (!rateLimit(`suggest:${clientIp(request)}`, 40, 20_000)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": "20" } });
  }
  const raw = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  const term = raw.replace(/^@/, "");
  if (term.length < 2) return NextResponse.json({ titles: [], people: [] });

  const lang = await getLang();
  const titlesP = raw.startsWith("@")
    ? Promise.resolve([])
    : searchTitles(term, lang)
        .then((items) => items.slice(0, 6))
        .catch(() => []);

  const peopleP = (async () => {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("search_people", { p_q: term });
      return ((data ?? []) as { username: string; display_name: string | null; avatar_url: string | null }[])
        .slice(0, raw.startsWith("@") ? 8 : 3)
        .map((p) => ({ username: p.username, name: p.display_name ?? p.username, avatarUrl: p.avatar_url }));
    } catch {
      return [];
    }
  })();

  const [titles, people] = await Promise.all([titlesP, peopleP]);
  return NextResponse.json({ titles, people }, { headers: { "Cache-Control": "private, max-age=60" } });
}
