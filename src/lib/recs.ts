import "server-only";
import { filterByProviders, getDiscover, getRelated, type CatalogKind, type MediaType, type TmdbItem } from "./tmdb";
import { genresForKind, isGenreKey, type GenreKey } from "./genre-filter";
import type { createClient } from "./supabase/server";

// «Para ti»: recomendaciones a partir de…
//   mix              → la mezcla de tus títulos mejor puntuados (por defecto)
//   t:movie:671      → un título concreto que te gustó
//   g:scifi          → un género
// La elección se guarda en la cookie claq_recs para que al volver siga igual.
export const RECS_COOKIE = "claq_recs";

export type LikedTitle = { key: string; title: string; media_type: MediaType; tmdb_id: number };
export type RecsResult = { items: TmdbItem[]; source: string; because: string | null };

type Supa = Awaited<ReturnType<typeof createClient>>;

// Tus títulos con nota ≥ 7 (opciones del desplegable y semillas del modo mezcla)
export async function likedTitles(supabase: Supa, userId: string, kind: CatalogKind): Promise<LikedTitle[]> {
  let q = supabase
    .from("user_titles")
    .select("tmdb_id, media_type, title, rating")
    .eq("user_id", userId)
    .gte("rating", 7)
    .order("rating", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(25);
  if (kind !== "all") q = q.eq("media_type", kind);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    key: `t:${r.media_type}:${r.tmdb_id}`,
    title: r.title as string,
    media_type: r.media_type as MediaType,
    tmdb_id: r.tmdb_id as number,
  }));
}

async function myKeys(supabase: Supa, userId: string) {
  const { data } = await supabase.from("user_titles").select("tmdb_id, media_type").eq("user_id", userId).limit(5000);
  return new Set((data ?? []).map((m) => `${m.media_type}-${m.tmdb_id}`));
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export async function computeRecs(
  supabase: Supa,
  userId: string,
  kind: CatalogKind,
  lang: string,
  source: string,
  liked?: LikedTitle[],
  providers: number[] = [] // «solo en mis plataformas»: si hay, se filtra por ellas
): Promise<RecsResult> {
  // Con filtro de plataformas se buscan más candidatos, porque muchos se caen
  const finish = async (list: TmdbItem[]) => (providers.length ? (await filterByProviders(list.slice(0, 40), providers, (x) => x.id)).slice(0, 16) : list.slice(0, 16));
  try {
    const [likes, have] = await Promise.all([liked ? Promise.resolve(liked) : likedTitles(supabase, userId, kind), myKeys(supabase, userId)]);
    const fresh = (it: TmdbItem) => !have.has(`${it.media_type}-${it.id}`) && (kind === "all" || it.media_type === kind);

    // Sorpresa: un título que te gustó o un género, al azar (distinto del actual si se puede)
    if (source.startsWith("random")) {
      const current = source.slice("random:".length);
      const genres = genresForKind(kind);
      const options = [...likes.map((l) => l.key), ...genres.map((g) => `g:${g}`)].filter((k) => k !== current);
      source = options.length ? pick(options) : "mix";
    }

    if (source.startsWith("t:")) {
      const [, type, id] = source.split(":");
      const seed = likes.find((l) => l.key === source);
      if ((type === "movie" || type === "tv") && Number(id) > 0) {
        const items = await finish((await getRelated(type, Number(id), lang)).filter(fresh));
        if (items.length) return { items, source, because: seed?.title ?? null };
      }
      source = "mix";
    }

    if (source.startsWith("g:")) {
      const g = source.slice(2);
      if (isGenreKey(g)) {
        // Varias páginas al azar de lo más popular del género, sin lo que ya tienes en tu lista
        const page = 1 + Math.floor(Math.random() * 3);
        const [a, b] = await Promise.all([
          getDiscover(kind, "popularity", providers.length ? 1 : page, lang, g as GenreKey, providers),
          getDiscover(kind, "rating", providers.length ? 1 : page, lang, g as GenreKey, providers),
        ]);
        const seen = new Set<string>();
        const items = [...a.items, ...b.items]
          .filter(fresh)
          .filter((it) => !seen.has(`${it.media_type}-${it.id}`) && !!seen.add(`${it.media_type}-${it.id}`))
          .sort(() => Math.random() - 0.5)
          .slice(0, 16);
        if (items.length) return { items, source, because: null };
      }
      source = "mix";
    }

    // Mezcla: parecidos a tus 6 mejores notas; pesa más lo que sale en varias
    const top = likes.slice(0, 6);
    if (!top.length) return { items: [], source: "mix", because: null };
    const lists = await Promise.all(top.map((t) => getRelated(t.media_type, t.tmdb_id, lang).catch(() => [])));
    const score = new Map<string, { item: TmdbItem; n: number }>();
    lists.forEach((list, i) =>
      list.forEach((it, pos) => {
        if (!fresh(it)) return;
        const k = `${it.media_type}-${it.id}`;
        const cur = score.get(k) ?? { item: it, n: 0 };
        cur.n += 6 - i + (20 - Math.min(pos, 19)) / 20;
        score.set(k, cur);
      })
    );
    const items = await finish([...score.values()].sort((a, b) => b.n - a.n).map((x) => x.item));
    return { items, source: "mix", because: null };
  } catch {
    return { items: [], source: "mix", because: null };
  }
}
