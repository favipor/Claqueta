import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiscover, getTrending, type TmdbItem } from "./tmdb";

export type SwipeKind = "all" | "movie" | "tv";

// Baraja (Fisher–Yates): cada vez que entras, otro orden
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rnd = (max: number) => 1 + Math.floor(Math.random() * max);

// Un lote de carátulas para «Desliza»: mezcla de populares, muy valoradas y tendencia,
// de páginas al azar de TMDB, sin lo que ya tienes en tu lista ni lo que ya ha salido en esta sesión
export async function swipeBatch(supabase: SupabaseClient, userId: string, lang: string, kind: SwipeKind, exclude: string[] = []): Promise<TmdbItem[]> {
  const none = { items: [] as TmdbItem[], totalPages: 1 };
  const types = kind === "all" ? (["movie", "tv"] as const) : ([kind] as const);
  const calls: Promise<TmdbItem[]>[] = [];
  for (const t of types) {
    calls.push(getDiscover(t, "popularity", rnd(15), lang).catch(() => none).then((r) => r.items));
    calls.push(getDiscover(t, "popularity", rnd(40), lang).catch(() => none).then((r) => r.items));
    calls.push(getDiscover(t, "rating", rnd(12), lang).catch(() => none).then((r) => r.items));
  }
  calls.push(getTrending(lang, "week", kind).catch(() => [] as TmdbItem[]));
  const [lists, mine] = await Promise.all([
    Promise.all(calls),
    supabase.from("user_titles").select("tmdb_id, media_type").eq("user_id", userId).limit(5000),
  ]);
  const skip = new Set([...exclude, ...(mine.data ?? []).map((m) => `${m.media_type}-${m.tmdb_id}`)]);
  const out: TmdbItem[] = [];
  for (const it of lists.flat()) {
    const k = `${it.media_type}-${it.id}`;
    if (!it.poster_path || skip.has(k)) continue;
    if (kind !== "all" && it.media_type !== kind) continue;
    skip.add(k);
    out.push(it);
  }
  return shuffle(out).slice(0, 40);
}
