"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { computeRecs, RECS_COOKIE, type RecsResult } from "@/lib/recs";
import type { CatalogKind } from "@/lib/tmdb";

// Cambia la base de «Para ti» (mezcla, un título, un género o sorpresa) y la recuerda
export async function loadRecs(kind: CatalogKind, source: string): Promise<RecsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], source: "mix", because: null };
  const { lang } = await getT();
  const k: CatalogKind = kind === "movie" || kind === "tv" ? kind : "all";
  const res = await computeRecs(supabase, user.id, k, lang, String(source).slice(0, 60));
  (await cookies()).set(`${RECS_COOKIE}_${k}`, res.source, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}
