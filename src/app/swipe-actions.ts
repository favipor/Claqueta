"use server";

import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { swipeBatch, type SwipeKind } from "@/lib/swipe";
import { getDetail, type TmdbItem } from "@/lib/tmdb";

// Más carátulas para «Desliza» cuando se acaban las que tienes delante
export async function loadSwipe(kind: SwipeKind, exclude: string[]): Promise<TmdbItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { lang } = await getT();
  const k: SwipeKind = kind === "movie" || kind === "tv" ? kind : "all";
  return swipeBatch(supabase, user.id, lang, k, (Array.isArray(exclude) ? exclude : []).slice(-600).map(String));
}

export type SwipeInfo = { year: string; overview: string; genres: string[]; runtime: number | null; seasons: number | null; vote: number; providers: { name: string; logo_path: string | null }[] };

// Sinopsis breve para la hoja que sale al tocar una carátula
export async function swipeInfo(type: "movie" | "tv", id: number): Promise<SwipeInfo | null> {
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(id)) return null;
  const { lang } = await getT();
  const d = await getDetail(type, id, lang).catch(() => null);
  if (!d) return null;
  return { year: d.year, overview: d.overview, genres: d.genres.map((g) => g.name).slice(0, 3), runtime: d.runtime, seasons: d.seasons, vote: d.vote_average, providers: d.providers.slice(0, 4) };
}
