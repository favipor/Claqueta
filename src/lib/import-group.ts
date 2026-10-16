import type { Status } from "./dict";
import type { SeasonStatus } from "./series-types";
import type { Candidate, ImportItem, ImportRow } from "./import-types";

const PRIORITY: Record<Status, number> = { pendiente: 1, viendo: 2, visto: 3, volver_a_ver: 4 };
const best = (a: Status | null, b: Status): Status => (a === null || PRIORITY[b] > PRIORITY[a] ? b : a);

const SEASON_PRIORITY: Record<SeasonStatus, number> = { pendiente: 1, viendo: 2, visto: 3 };
function toSeasonStatus(s: Status): SeasonStatus {
  return s === "visto" || s === "volver_a_ver" ? "visto" : s === "viendo" ? "viendo" : "pendiente";
}

// Junta las filas que apuntan a la misma ficha de TMDB (duplicados y temporadas de una misma serie)
export function groupItems(
  rows: ImportRow[],
  pick: (qkey: string) => Candidate | null
): ImportItem[] {
  const map = new Map<string, ImportItem & { ratings: number[] }>();

  for (const row of rows) {
    const c = pick(row.qkey);
    if (!c) continue;

    const key = `${c.media_type}-${c.id}`;
    let it = map.get(key);
    if (!it) {
      it = {
        tmdb_id: c.id,
        media_type: c.media_type,
        title: c.title,
        poster_path: c.poster_path,
        status: null,
        rating: null,
        seasons: {},
        ratings: [],
      };
      map.set(key, it);
    }

    if (c.media_type === "tv" && row.season !== null) {
      const next = toSeasonStatus(row.status);
      const prev = it.seasons[row.season];
      if (!prev || SEASON_PRIORITY[next] > SEASON_PRIORITY[prev]) it.seasons[row.season] = next;
    } else {
      it.status = best(it.status, row.status);
    }
    if (row.rating !== null) it.ratings.push(row.rating);
  }

  return [...map.values()].map(({ ratings, ...item }) => ({
    ...item,
    // varias notas (p. ej. una por temporada): se hace la media y se redondea a 0,5
    rating:
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((a, n) => a + n, 0) / ratings.length) * 2) / 2,
    // las películas siempre tienen estado
    status: item.media_type === "movie" ? (item.status ?? "pendiente") : item.status,
  }));
}
