"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, type Status } from "@/lib/dict";
import { getSeasonEpisodes, getTitleMeta, getTvSeasons } from "@/lib/tmdb";
import { isAired } from "@/lib/aired";
import { matchOne } from "@/lib/import-match";
import type { SeasonStatus } from "@/lib/series-types";
import type {
  ImportBatchResult,
  ImportItem,
  MatchQuery,
  MatchResult,
} from "@/lib/import-types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ------------------------------------------------------------ emparejar con TMDB

export async function matchBatch(queries: MatchQuery[]): Promise<MatchResult[]> {
  const { user } = await requireUser();
  if (!user || !Array.isArray(queries) || queries.length > 12) return [];

  const clean = queries
    .filter((q) => q && typeof q.query === "string" && q.query.trim() !== "")
    .map((q) => ({
      qkey: String(q.qkey),
      query: q.query.slice(0, 200),
      alt: q.alt ? String(q.alt).slice(0, 200) : null,
      year: q.year && /^\d{4}$/.test(q.year) ? q.year : null,
      hint: q.hint === "tv" ? ("tv" as const) : ("movie" as const),
    }));

  return Promise.all(
    clean.map((q) =>
      matchOne(q, "es").catch(() => ({ qkey: q.qkey, candidates: [], auto: false }))
    )
  );
}

// ------------------------------------------------------------ guardar

const SEASON_STATUSES: SeasonStatus[] = ["pendiente", "viendo", "visto"];
const chunk = <T,>(arr: T[], n: number) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

function validate(it: ImportItem): ImportItem | null {
  if (!it || !Number.isInteger(it.tmdb_id) || it.tmdb_id <= 0) return null;
  if (it.media_type !== "movie" && it.media_type !== "tv") return null;
  if (it.status !== null && !STATUSES.includes(it.status)) return null;
  if (it.rating !== null && (typeof it.rating !== "number" || it.rating < 0 || it.rating > 10 || (it.rating * 2) % 1 !== 0)) {
    return null;
  }
  const seasons: Record<number, SeasonStatus> = {};
  for (const [k, v] of Object.entries(it.seasons ?? {})) {
    const n = Number(k);
    if (Number.isInteger(n) && n >= 1 && n <= 100 && SEASON_STATUSES.includes(v)) seasons[n] = v;
  }
  return {
    tmdb_id: it.tmdb_id,
    media_type: it.media_type,
    title: String(it.title ?? "").slice(0, 300),
    poster_path: it.poster_path ?? null,
    status: it.status,
    rating: it.rating,
    seasons,
  };
}

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}

async function importOne(
  sb: SupabaseClient,
  userId: string,
  it: ImportItem
): Promise<"imported" | "skipped"> {
  // Lo que ya tienes con estado en Claqueta no se pisa
  const { data: existing } = await sb
    .from("user_titles")
    .select("status")
    .eq("user_id", userId)
    .eq("tmdb_id", it.tmdb_id)
    .eq("media_type", it.media_type)
    .maybeSingle();
  if (existing?.status) return "skipped";

  const meta = await getTitleMeta(it.media_type, it.tmdb_id).catch(() => null);
  const base = {
    user_id: userId,
    tmdb_id: it.tmdb_id,
    media_type: it.media_type,
    title: it.title,
    poster_path: it.poster_path,
    ...(it.rating !== null ? { rating: it.rating } : {}),
    ...(meta ? { runtime_min: meta.runtime_min, genres: meta.genres } : {}),
  };

  if (it.media_type === "movie") {
    check(
      await sb
        .from("user_titles")
        .upsert({ ...base, status: it.status ?? "pendiente" }, { onConflict: "user_id,tmdb_id,media_type" })
    );
    return "imported";
  }

  // ---- serie: temporadas y capítulos
  const info = (await getTvSeasons(it.tmdb_id, "es")).filter(
    (s) => s.season_number >= 1 && s.episode_count > 0
  );
  const existingSeasons = new Set(info.map((s) => s.season_number));

  // Temporadas que se marcan como vistas: todas si la serie entera está Visto, o las que pone el Excel
  const toSee = new Set<number>();
  if (it.status === "visto" || it.status === "volver_a_ver") info.forEach((s) => toSee.add(s.season_number));
  for (const [k, v] of Object.entries(it.seasons)) {
    if (v === "visto" && existingSeasons.has(Number(k))) toSee.add(Number(k));
  }

  const seasonStatus: Record<number, SeasonStatus> = {};
  const episodeRows: { season_number: number; episode_number: number }[] = [];

  const lists = await Promise.all(
    [...toSee].map(async (sn) => ({ sn, eps: await getSeasonEpisodes(it.tmdb_id, sn, "es") }))
  );
  for (const { sn, eps } of lists) {
    const aired = eps.filter(isAired);
    if (aired.length === 0) continue;
    for (const e of aired) episodeRows.push({ season_number: sn, episode_number: e.episode_number });
    seasonStatus[sn] = aired.length >= eps.length ? "visto" : "viendo";
  }
  for (const [k, v] of Object.entries(it.seasons)) {
    const sn = Number(k);
    if (v === "viendo" && existingSeasons.has(sn) && seasonStatus[sn] === undefined) {
      seasonStatus[sn] = "viendo";
    }
  }

  // Estado de la serie: las mismas reglas que usa la web
  const allSeen = info.length > 0 && info.every((s) => seasonStatus[s.season_number] === "visto");
  const anySeason = Object.keys(seasonStatus).length > 0;
  let status: Status;
  if (it.status === "visto" || it.status === "volver_a_ver") status = it.status;
  else if (allSeen) status = "visto";
  else if (anySeason) status = "viendo";
  else status = it.status ?? "pendiente";

  check(await sb.from("user_titles").upsert({ ...base, status }, { onConflict: "user_id,tmdb_id,media_type" }));

  const seasonRows = Object.entries(seasonStatus).map(([k, v]) => ({
    user_id: userId,
    tmdb_id: it.tmdb_id,
    season_number: Number(k),
    status: v,
  }));
  if (seasonRows.length > 0) {
    check(await sb.from("user_seasons").upsert(seasonRows, { onConflict: "user_id,tmdb_id,season_number" }));
  }
  for (const part of chunk(episodeRows, 500)) {
    check(
      await sb.from("user_episodes").upsert(
        part.map((r) => ({ user_id: userId, tmdb_id: it.tmdb_id, ...r })),
        { onConflict: "user_id,tmdb_id,season_number,episode_number" }
      )
    );
  }
  return "imported";
}

export async function importBatch(items: ImportItem[]): Promise<ImportBatchResult> {
  const { supabase, user } = await requireUser();
  const result: ImportBatchResult = { imported: 0, skipped: 0, failed: [] };
  if (!user || !Array.isArray(items) || items.length > 6) return result;

  for (const raw of items) {
    const it = validate(raw);
    if (!it) {
      result.failed.push(String(raw?.title ?? "?"));
      continue;
    }
    try {
      const r = await importOne(supabase, user.id, it);
      if (r === "imported") result.imported++;
      else result.skipped++;
    } catch {
      result.failed.push(it.title);
    }
  }

  revalidatePath("/mi-lista");
  return result;
}
