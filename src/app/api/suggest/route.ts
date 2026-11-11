import { NextResponse } from "next/server";
import { searchTitles } from "@/lib/tmdb";
import { getLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

// Sugerencias mientras se escribe en el buscador: títulos de TMDB y personas de Claqueta.
export async function GET(request: Request) {
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
  return NextResponse.json({ titles, people });
}
