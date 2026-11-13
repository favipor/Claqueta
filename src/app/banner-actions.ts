"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { isValidBanner } from "@/lib/banner";
import { getDetail, searchBackdrops, type BackdropHit } from "@/lib/tmdb";

// Guarda el banner de tu tarjeta (null = automático)
export async function setBanner(value: string | null): Promise<{ ok: boolean }> {
  const v = value === null ? null : String(value).slice(0, 80);
  if (!isValidBanner(v)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: me, error } = await supabase.from("profiles").update({ banner: v }).eq("id", user.id).select("username").maybeSingle();
  if (error) return { ok: false };
  if (me?.username) revalidatePath(`/u/${me.username}`);
  revalidatePath("/descubrir");
  return { ok: true };
}

// Sugerencias: fondos de lo que mejor has puntuado
export async function bannerSuggestions(): Promise<BackdropHit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { lang } = await getT();
  const { data } = await supabase
    .from("user_titles")
    .select("tmdb_id, media_type")
    .eq("user_id", user.id)
    .in("status", ["visto", "volver_a_ver", "viendo"])
    .order("rating", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(8);
  const det = await Promise.all((data ?? []).map((r) => getDetail(r.media_type, r.tmdb_id, lang).catch(() => null)));
  return det
    .filter((d): d is NonNullable<typeof d> => !!d && !!d.backdrop_path)
    .map((d) => ({ id: d.id, media_type: d.media_type, title: d.title, year: d.year, backdrop_path: d.backdrop_path! }));
}

export async function findBackdrops(q: string): Promise<BackdropHit[]> {
  const s = String(q ?? "").trim();
  if (s.length < 2) return [];
  const { lang } = await getT();
  return searchBackdrops(s, lang).catch(() => []);
}
