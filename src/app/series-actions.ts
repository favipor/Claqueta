"use server";

import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n-server";
import { getSeasonEpisodes, getTvSeasons } from "@/lib/tmdb";
import { isAired } from "@/lib/aired";
import { readTvState } from "@/lib/tv-state";
import { STATUSES, type Status } from "@/lib/dict";
import type { SeasonStatus, TvActionResult, TvMeta, TvState } from "@/lib/series-types";
import { updateEntry } from "./actions";

/*
 * Reglas del seguimiento de series
 * --------------------------------
 * - "Visto" baja en cascada (serie -> temporadas -> capítulos). "Viendo" no.
 * - Si todos los capítulos de una temporada están vistos, la temporada pasa a "Visto".
 * - Si todas las temporadas están vistas, la serie pasa a "Visto".
 * - Si desmarcas un capítulo de una temporada vista, esa temporada y la serie vuelven a "Viendo".
 * - Si marcas un capítulo en una serie sin estado (o "Pendiente"), la serie pasa a "Viendo".
 * - Quitar el "Visto" de una serie o temporada (dejándola en Pendiente) borra los capítulos marcados.
 * - Los especiales (temporada 0) no cuentan para completar la serie.
 */

const SEASON_STATUSES: SeasonStatus[] = ["pendiente", "viendo", "visto"];

async function getContext(meta: TvMeta) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !meta || !Number.isInteger(meta.tmdb_id) || meta.tmdb_id <= 0) return null;
  const lang = await getLang();
  return {
    supabase,
    user,
    lang,
    meta: {
      tmdb_id: meta.tmdb_id,
      title: String(meta.title ?? "").slice(0, 300),
      poster_path: meta.poster_path ?? null,
    } satisfies TvMeta,
  };
}
type Ctx = NonNullable<Awaited<ReturnType<typeof getContext>>>;

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}

async function setSeason(c: Ctx, season: number, status: SeasonStatus) {
  const q = c.supabase.from("user_seasons");
  if (status === "pendiente") {
    check(
      await q
        .delete()
        .eq("user_id", c.user.id)
        .eq("tmdb_id", c.meta.tmdb_id)
        .eq("season_number", season)
    );
  } else {
    check(
      await q.upsert(
        { user_id: c.user.id, tmdb_id: c.meta.tmdb_id, season_number: season, status },
        { onConflict: "user_id,tmdb_id,season_number" }
      )
    );
  }
}

async function addEpisodes(c: Ctx, rows: { season_number: number; episode_number: number }[]) {
  for (let i = 0; i < rows.length; i += 500) {
    check(
      await c.supabase.from("user_episodes").upsert(
        rows.slice(i, i + 500).map((r) => ({
          user_id: c.user.id,
          tmdb_id: c.meta.tmdb_id,
          ...r,
        })),
        { onConflict: "user_id,tmdb_id,season_number,episode_number" }
      )
    );
  }
}

async function removeSeasonEpisodes(c: Ctx, season: number) {
  check(
    await c.supabase
      .from("user_episodes")
      .delete()
      .eq("user_id", c.user.id)
      .eq("tmdb_id", c.meta.tmdb_id)
      .eq("season_number", season)
  );
}

async function clearAll(c: Ctx) {
  check(
    await c.supabase
      .from("user_episodes")
      .delete()
      .eq("user_id", c.user.id)
      .eq("tmdb_id", c.meta.tmdb_id)
  );
  check(
    await c.supabase
      .from("user_seasons")
      .delete()
      .eq("user_id", c.user.id)
      .eq("tmdb_id", c.meta.tmdb_id)
  );
}

async function setSeriesStatus(c: Ctx, status: Status | null) {
  const res = await updateEntry({
    tmdb_id: c.meta.tmdb_id,
    media_type: "tv",
    title: c.meta.title,
    poster_path: c.meta.poster_path,
    patch: { status },
  });
  if (!res.ok) throw new Error("series_status");
}

/**
 * Aplica las reglas automáticas tras un cambio y devuelve el estado final.
 * - touched: temporadas cuyo estado hay que recalcular a partir de sus capítulos.
 * - promoteSeries: pasar la serie a "Viendo" aunque aún no haya capítulos vistos.
 * - skipSeries: no tocar el estado de la serie (cuando el usuario lo ha fijado a mano).
 */
async function recompute(
  c: Ctx,
  touched: number[],
  opts: { promoteSeries?: boolean; skipSeries?: boolean } = {}
): Promise<TvState> {
  let state = await readTvState(c.supabase, c.user.id, c.meta.tmdb_id);

  for (const sn of touched) {
    const episodes = await getSeasonEpisodes(c.meta.tmdb_id, sn, c.lang);
    const total = episodes.length;
    const count = state.watched.filter((k) => k.startsWith(`${sn}-`)).length;
    const prev: SeasonStatus = state.seasons[sn] ?? "pendiente";

    let next: SeasonStatus = prev;
    if (total > 0 && count >= total) next = "visto";
    else if (prev === "visto") next = "viendo";
    else if (count > 0 && prev === "pendiente") next = "viendo";

    if (next !== prev) {
      await setSeason(c, sn, next);
      state = { ...state, seasons: { ...state.seasons, [sn]: next } };
    }
  }

  if (!opts.skipSeries) {
    const seasons = await getTvSeasons(c.meta.tmdb_id, c.lang);
    const considered = seasons.filter((s) => s.season_number > 0 && s.episode_count > 0);
    const allSeen =
      considered.length > 0 &&
      considered.every((s) => (state.seasons[s.season_number] ?? "pendiente") === "visto");
    const anyWatched = state.watched.some((k) => !k.startsWith("0-"));
    const prev = state.seriesStatus;
    const unset = prev === null || prev === "pendiente";

    let next: Status | null = prev;
    if (allSeen && (unset || prev === "viendo")) next = "visto";
    else if (!allSeen && prev === "visto") next = "viendo";
    else if (!allSeen && unset && (anyWatched || opts.promoteSeries)) next = "viendo";

    if (next !== prev) {
      await setSeriesStatus(c, next);
      state = { ...state, seriesStatus: next };
    }
  }

  return state;
}

// ---------------------------------------------------------------- acciones

export async function getTvStateAction(tmdbId: number): Promise<TvActionResult> {
  const c = await getContext({ tmdb_id: tmdbId, title: "", poster_path: null });
  if (!c) return { ok: false };
  try {
    return { ok: true, state: await readTvState(c.supabase, c.user.id, c.meta.tmdb_id) };
  } catch {
    return { ok: false };
  }
}

// El usuario cambia el estado de la SERIE.
export async function setSeriesStatusAction(
  meta: TvMeta,
  status: Status | null
): Promise<TvActionResult> {
  const c = await getContext(meta);
  if (!c) return { ok: false };
  if (status !== null && !STATUSES.includes(status)) return { ok: false };

  try {
    const before = await readTvState(c.supabase, c.user.id, c.meta.tmdb_id);
    await setSeriesStatus(c, status);

    if (status === "visto") {
      // Cascada: se marcan todos los capítulos ya emitidos de todas las temporadas.
      const seasons = (await getTvSeasons(c.meta.tmdb_id, c.lang)).filter(
        (s) => s.season_number >= 1 && s.episode_count > 0
      );
      const lists = await Promise.all(
        seasons.map(async (s) => ({
          sn: s.season_number,
          eps: await getSeasonEpisodes(c.meta.tmdb_id, s.season_number, c.lang),
        }))
      );
      const rows = lists.flatMap(({ sn, eps }) =>
        eps.filter(isAired).map((e) => ({ season_number: sn, episode_number: e.episode_number }))
      );
      await addEpisodes(c, rows);
      const state = await recompute(
        c,
        lists.map((l) => l.sn),
        { skipSeries: true }
      );
      return { ok: true, state };
    }

    if ((status === null || status === "pendiente") && before.seriesStatus === "visto") {
      await clearAll(c);
    }
    return { ok: true, state: await readTvState(c.supabase, c.user.id, c.meta.tmdb_id) };
  } catch {
    return { ok: false };
  }
}

// El usuario cambia el estado de una TEMPORADA.
export async function setSeasonStatusAction(
  meta: TvMeta,
  season: number,
  status: SeasonStatus
): Promise<TvActionResult> {
  const c = await getContext(meta);
  if (!c) return { ok: false };
  if (!Number.isInteger(season) || season < 0 || !SEASON_STATUSES.includes(status)) {
    return { ok: false };
  }

  try {
    const before = await readTvState(c.supabase, c.user.id, c.meta.tmdb_id);
    const prev: SeasonStatus = before.seasons[season] ?? "pendiente";

    if (status === "visto") {
      const eps = await getSeasonEpisodes(c.meta.tmdb_id, season, c.lang);
      await addEpisodes(
        c,
        eps.filter(isAired).map((e) => ({ season_number: season, episode_number: e.episode_number }))
      );
      // Si la temporada aún tiene capítulos sin emitir, quedará en "Viendo".
      const state = await recompute(c, [season], { promoteSeries: true });
      return { ok: true, state };
    }

    if (status === "pendiente") {
      if (prev === "visto") await removeSeasonEpisodes(c, season);
      await setSeason(c, season, "pendiente");
      return { ok: true, state: await recompute(c, []) };
    }

    // "viendo": no baja en cascada
    await setSeason(c, season, "viendo");
    return { ok: true, state: await recompute(c, [], { promoteSeries: true }) };
  } catch {
    return { ok: false };
  }
}

// El usuario marca o desmarca un CAPÍTULO.
export async function toggleEpisodeAction(
  meta: TvMeta,
  season: number,
  episode: number,
  watched: boolean
): Promise<TvActionResult> {
  const c = await getContext(meta);
  if (!c) return { ok: false };
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 0) {
    return { ok: false };
  }

  try {
    if (watched) {
      const eps = await getSeasonEpisodes(c.meta.tmdb_id, season, c.lang);
      const ep = eps.find((e) => e.episode_number === episode);
      if (!ep || !isAired(ep)) return { ok: false, error: "unaired" };
      await addEpisodes(c, [{ season_number: season, episode_number: episode }]);
    } else {
      check(
        await c.supabase
          .from("user_episodes")
          .delete()
          .eq("user_id", c.user.id)
          .eq("tmdb_id", c.meta.tmdb_id)
          .eq("season_number", season)
          .eq("episode_number", episode)
      );
    }
    return { ok: true, state: await recompute(c, [season]) };
  } catch {
    return { ok: false };
  }
}

// "Marcar hasta aquí": este capítulo y todos los anteriores (ya emitidos) pasan a vistos.
export async function markUntilAction(
  meta: TvMeta,
  season: number,
  episode: number
): Promise<TvActionResult> {
  const c = await getContext(meta);
  if (!c) return { ok: false };
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 0) {
    return { ok: false };
  }

  try {
    const all = await getTvSeasons(c.meta.tmdb_id, c.lang);
    const targets =
      season === 0
        ? [0]
        : all
            .filter((s) => s.season_number >= 1 && s.season_number <= season && s.episode_count > 0)
            .map((s) => s.season_number);

    const lists = await Promise.all(
      targets.map(async (sn) => ({
        sn,
        eps: await getSeasonEpisodes(c.meta.tmdb_id, sn, c.lang),
      }))
    );
    const rows = lists.flatMap(({ sn, eps }) =>
      eps
        .filter((e) => isAired(e) && (sn < season || e.episode_number <= episode))
        .map((e) => ({ season_number: sn, episode_number: e.episode_number }))
    );
    await addEpisodes(c, rows);
    return { ok: true, state: await recompute(c, targets) };
  } catch {
    return { ok: false };
  }
}
