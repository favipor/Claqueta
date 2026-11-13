import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { getDiscover, getTrending, type TmdbItem } from "@/lib/tmdb";
import { GuidedStart } from "@/components/GuidedStart";

export const metadata = { title: "Empieza", robots: { index: false } };

// Arranque guiado tras registrarse: primero pregunta si quieres la visita (puedes decir que no)
// y, si quieres, enseña títulos muy conocidos para marcarlos de un toque.
export default async function StartPage({ searchParams }: { searchParams: Promise<{ directo?: string }> }) {
  const { directo } = await searchParams;
  const { lang } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const none = { items: [] as TmdbItem[], totalPages: 1 };
  const [trend, movies, shows, mine, prof] = await Promise.all([
    getTrending(lang, "week").catch(() => [] as TmdbItem[]),
    getDiscover("movie", "rating", 1, lang).catch(() => none),
    getDiscover("tv", "rating", 1, lang).catch(() => none),
    supabase.from("user_titles").select("tmdb_id, media_type").eq("user_id", user.id).limit(5000),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  const have = new Set((mine.data ?? []).map((m) => `${m.media_type}-${m.tmdb_id}`));
  // Se intercalan: clásicos de cine, series muy valoradas y lo que se ve ahora
  const lists = [movies.items, shows.items, trend];
  const seen = new Set<string>();
  const pool: TmdbItem[] = [];
  for (let i = 0; i < 20; i++) {
    for (const l of lists) {
      const it = l[i];
      if (!it || !it.poster_path) continue;
      const k = `${it.media_type}-${it.id}`;
      if (seen.has(k) || have.has(k)) continue;
      seen.add(k);
      pool.push(it);
    }
  }
  return <GuidedStart pool={pool.slice(0, 40)} username={prof.data?.username ?? null} direct={directo === "1"} />;
}
