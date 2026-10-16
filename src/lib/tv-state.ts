import type { SupabaseClient } from "@supabase/supabase-js";
import type { Status } from "./dict";
import type { SeasonStatus, TvState } from "./series-types";

const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por consulta

async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error || !data) throw new Error("db");
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

// Lee el estado de la serie, de sus temporadas y los capítulos vistos de un usuario.
export async function readTvState(
  sb: SupabaseClient,
  userId: string,
  tmdbId: number
): Promise<TvState> {
  const [title, seasons, episodes] = await Promise.all([
    sb
      .from("user_titles")
      .select("status")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", "tv")
      .maybeSingle(),
    sb
      .from("user_seasons")
      .select("season_number, status")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId),
    fetchAll((from, to) =>
      sb
        .from("user_episodes")
        .select("season_number, episode_number")
        .eq("user_id", userId)
        .eq("tmdb_id", tmdbId)
        .order("season_number")
        .order("episode_number")
        .range(from, to)
    ),
  ]);

  const seasonMap: Record<number, SeasonStatus> = {};
  for (const r of seasons.data ?? []) seasonMap[r.season_number] = r.status as SeasonStatus;

  return {
    seriesStatus: (title.data?.status ?? null) as Status | null,
    seasons: seasonMap,
    watched: episodes.map((e) => `${e.season_number}-${e.episode_number}`),
  };
}

// Capítulos vistos de varias series a la vez (para las barras de progreso de "Mi lista").
export async function readWatchedForTitles(
  sb: SupabaseClient,
  userId: string,
  tmdbIds: number[]
): Promise<{ tmdb_id: number; season_number: number }[]> {
  if (tmdbIds.length === 0) return [];
  return fetchAll((from, to) =>
    sb
      .from("user_episodes")
      .select("tmdb_id, season_number")
      .eq("user_id", userId)
      .in("tmdb_id", tmdbIds)
      .order("tmdb_id")
      .order("season_number")
      .order("episode_number")
      .range(from, to)
  );
}
