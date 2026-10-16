"use client";

import { useRef, useState } from "react";
import type { TvSeason } from "@/lib/tmdb";
import type { Status } from "@/lib/dict";
import type { SeasonStatus, TvActionResult, TvMeta, TvState } from "@/lib/series-types";
import {
  getTvStateAction,
  markUntilAction,
  setSeasonStatusAction,
  setSeriesStatusAction,
  toggleEpisodeAction,
} from "@/app/series-actions";
import { TrackPanel } from "./TrackPanel";
import { SeasonsTracker } from "./SeasonsTracker";
import { useI18n } from "./I18nProvider";

type Initial = { status: Status | null; rating: number | null; private_note: string | null };

// Une el panel de seguimiento de la serie con el de temporadas/capítulos.
// Las acciones se ejecutan una detrás de otra para que las reglas automáticas no se pisen.
export function TvTracking({
  meta,
  seasons,
  initialState,
  initial,
}: {
  meta: TvMeta;
  seasons: TvSeason[];
  initialState: TvState;
  initial: Initial;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<TvState>(initialState);
  const [inflight, setInflight] = useState(0);
  const [error, setError] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const count = useRef(0);

  function run(action: () => Promise<TvActionResult>, optimistic?: (s: TvState) => TvState) {
    setError(false);
    if (optimistic) setState(optimistic);
    count.current += 1;
    setInflight(count.current);

    queue.current = queue.current.then(async () => {
      let res: TvActionResult = { ok: false };
      try {
        res = await action();
      } catch {}
      count.current -= 1;
      setInflight(count.current);

      // Solo se aplica el resultado del servidor cuando no quedan más acciones en cola.
      if (res.ok && res.state) {
        if (count.current === 0) setState(res.state);
      } else {
        setError(true);
        if (count.current === 0) {
          const fresh = await getTvStateAction(meta.tmdb_id).catch(() => null);
          if (fresh?.ok && fresh.state) setState(fresh.state);
        }
      }
    });
  }

  const busy = inflight > 0;

  return (
    <div className="space-y-5">
      <TrackPanel
        tmdbId={meta.tmdb_id}
        mediaType="tv"
        title={meta.title}
        posterPath={meta.poster_path}
        initial={initial}
        status={state.seriesStatus}
        onStatusChange={(next: Status | null) =>
          run(
            () => setSeriesStatusAction(meta, next),
            (s) => ({ ...s, seriesStatus: next })
          )
        }
      />

      <SeasonsTracker
        tmdbId={meta.tmdb_id}
        seasons={seasons}
        state={state}
        busy={busy}
        onSeason={(sn: number, status: SeasonStatus) =>
          run(() => setSeasonStatusAction(meta, sn, status))
        }
        onEpisode={(sn, ep, watched) =>
          run(
            () => toggleEpisodeAction(meta, sn, ep, watched),
            (s) => {
              const key = `${sn}-${ep}`;
              const rest = s.watched.filter((k) => k !== key);
              return { ...s, watched: watched ? [...rest, key] : rest };
            }
          )
        }
        onUntil={(sn, ep) => run(() => markUntilAction(meta, sn, ep))}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t("tv.errorSave")}
        </p>
      )}
    </div>
  );
}
