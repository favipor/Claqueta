import type { CatalogKind } from "./tmdb";

// Géneros del catálogo. Películas y series usan ids distintos en TMDB, así que cada género
// de la lista apunta a su id de película y a su id de serie (null = no existe para series).
export const CATALOG_GENRES = {
  action: [28, 10759],
  adventure: [12, 10759],
  animation: [16, 16],
  comedy: [35, 35],
  crime: [80, 80],
  documentary: [99, 99],
  drama: [18, 18],
  family: [10751, 10751],
  fantasy: [14, 10765],
  history: [36, null],
  horror: [27, null],
  music: [10402, null],
  mystery: [9648, 9648],
  romance: [10749, null],
  scifi: [878, 10765],
  thriller: [53, null],
  war: [10752, 10768],
  western: [37, 37],
} as const satisfies Record<string, readonly [number, number | null]>;

export type GenreKey = keyof typeof CATALOG_GENRES;
export const GENRE_KEYS = Object.keys(CATALOG_GENRES) as GenreKey[];

export function isGenreKey(v: string | null | undefined): v is GenreKey {
  return !!v && v in CATALOG_GENRES;
}

/** id de TMDB de ese género para películas ("movie") o series ("tv"); null si no existe */
export function genreIdFor(key: GenreKey, type: "movie" | "tv"): number | null {
  return CATALOG_GENRES[key][type === "movie" ? 0 : 1];
}

/** géneros que se pueden elegir en cada catálogo */
export function genresForKind(kind: CatalogKind): GenreKey[] {
  return kind === "tv" ? GENRE_KEYS.filter((k) => CATALOG_GENRES[k][1] !== null) : GENRE_KEYS;
}
