"use server";

import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { swipeBatch, type SwipeKind } from "@/lib/swipe";
import type { TmdbItem } from "@/lib/tmdb";

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
