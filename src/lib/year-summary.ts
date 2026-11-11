import type { SupabaseClient } from "@supabase/supabase-js";

export type YearSummary = {
  year: number;
  movies: number;
  series: number;
  episodes: number;
  movie_minutes: number;
  tv_minutes: number;
  avg_rating: number | null;
  rated: number;
  genres: { id: number; n: number }[];
  top: { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null; rating: number }[];
  months: { m: number; n: number }[];
};

export const FIRST_YEAR = 2024;

export function parseYear(raw: string | undefined): number | null {
  const y = Number(raw);
  const now = new Date().getUTCFullYear();
  return Number.isInteger(y) && y >= FIRST_YEAR && y <= now ? y : null;
}

// Perfil + resumen del año (phase9.sql). null si no existe, es privado para ti o falta el SQL.
export async function loadYearSummary(supabase: SupabaseClient, username: string, year: number) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return { profile: null, summary: null };
  const { data, error } = await supabase.rpc("year_summary", { p_user: profile.id, p_year: year });
  if (error || !data) return { profile, summary: null };
  const s = data as YearSummary;
  return {
    profile,
    summary: {
      ...s,
      movies: Number(s.movies) || 0,
      series: Number(s.series) || 0,
      episodes: Number(s.episodes) || 0,
      movie_minutes: Number(s.movie_minutes) || 0,
      tv_minutes: Number(s.tv_minutes) || 0,
      avg_rating: s.avg_rating === null ? null : Number(s.avg_rating),
      rated: Number(s.rated) || 0,
      top: (s.top ?? []).map((t) => ({ ...t, rating: Number(t.rating) })),
      months: (s.months ?? []).map((m) => ({ m: Number(m.m), n: Number(m.n) })),
      genres: (s.genres ?? []).map((g) => ({ id: Number(g.id), n: Number(g.n) })),
    } as YearSummary,
  };
}

export const totalHours = (s: YearSummary) => Math.round((s.movie_minutes + s.tv_minutes) / 60);
