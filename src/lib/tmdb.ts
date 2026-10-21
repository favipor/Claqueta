export type MediaType = "movie" | "tv";

export type TmdbItem = {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  year: string;
  vote_average: number;
};

export type TmdbDetail = TmdbItem & {
  backdrop_path: string | null;
  overview: string;
  tagline: string;
  genres: { id: number; name: string }[];
  runtime: number | null; // minutos (películas) o duración media de capítulo (series)
  seasons: number | null;
  episodes: number | null;
  original_language: string;
  cast: { id: number; name: string; character: string; profile_path: string | null }[];
  trailerKey: string | null;
  providers: { name: string; logo_path: string | null }[];
  providersLink: string | null;
  kind: "movie" | "tv" | "anime" | "documentary";
};

const BASE = "https://api.themoviedb.org/3";

export function img(path: string | null | undefined, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function tmdbLocale(lang: string) {
  return lang === "en" ? "en-US" : "es-ES";
}

async function tmdb<T = any>(
  path: string,
  lang: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("language", tmdbLocale(lang));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
      accept: "application/json",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} en ${path}`);
  return res.json();
}

function normalize(r: any, forcedType?: MediaType): TmdbItem | null {
  const type: MediaType | undefined = forcedType ?? r.media_type;
  if (type !== "movie" && type !== "tv") return null;
  const date: string = (type === "movie" ? r.release_date : r.first_air_date) ?? "";
  return {
    id: r.id,
    media_type: type,
    title: (type === "movie" ? r.title : r.name) ?? "",
    poster_path: r.poster_path ?? null,
    year: date.slice(0, 4),
    vote_average: r.vote_average ?? 0,
  };
}

export type TvSeason = {
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
};

export type TvEpisode = {
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime: number | null;
};

// Lista de temporadas de una serie (incluye la 0 = especiales, si existe).
export async function getTvSeasons(id: number, lang: string): Promise<TvSeason[]> {
  const d = await tmdb(`/tv/${id}`, lang);
  return ((d.seasons ?? []) as any[]).map((s) => ({
    season_number: s.season_number as number,
    name: (s.name as string) ?? "",
    episode_count: (s.episode_count as number) ?? 0,
    air_date: (s.air_date as string | null) ?? null,
  }));
}

// Capítulos de una temporada.
export async function getSeasonEpisodes(
  id: number,
  season: number,
  lang: string
): Promise<TvEpisode[]> {
  const d = await tmdb(`/tv/${id}/season/${season}`, lang);
  return ((d.episodes ?? []) as any[]).map((e) => ({
    episode_number: e.episode_number as number,
    name: (e.name as string) ?? "",
    air_date: (e.air_date as string | null) || null,
    runtime: (e.runtime as number | null) ?? null,
  }));
}

export type SearchCandidate = {
  id: number;
  media_type: MediaType;
  title: string;
  original_title: string;
  year: string;
  poster_path: string | null;
  popularity: number;
};

// Busca por separado en películas y en series (se usa en el importador del Excel).
export async function searchCandidates(
  q: string,
  lang: string,
  year?: string | null
): Promise<SearchCandidate[]> {
  const empty = { results: [] as any[] };
  const [m, t] = await Promise.all([
    tmdb("/search/movie", lang, {
      query: q,
      include_adult: "false",
      ...(year ? { year } : {}),
    }).catch(() => empty),
    tmdb("/search/tv", lang, {
      query: q,
      include_adult: "false",
      ...(year ? { first_air_date_year: year } : {}),
    }).catch(() => empty),
  ]);

  const out: SearchCandidate[] = [];
  for (const r of (m.results ?? []) as any[]) {
    out.push({
      id: r.id,
      media_type: "movie",
      title: r.title ?? "",
      original_title: r.original_title ?? "",
      year: String(r.release_date ?? "").slice(0, 4),
      poster_path: r.poster_path ?? null,
      popularity: r.popularity ?? 0,
    });
  }
  for (const r of (t.results ?? []) as any[]) {
    out.push({
      id: r.id,
      media_type: "tv",
      title: r.name ?? "",
      original_title: r.original_name ?? "",
      year: String(r.first_air_date ?? "").slice(0, 4),
      poster_path: r.poster_path ?? null,
      popularity: r.popularity ?? 0,
    });
  }
  return out;
}

// Duración (película o capítulo medio) y géneros, para las estadísticas del perfil.
export async function getTitleMeta(
  type: MediaType,
  id: number
): Promise<{ runtime_min: number | null; genres: number[] }> {
  const d = await tmdb(`/${type}/${id}`, "en");
  const runtime =
    type === "movie"
      ? d.runtime
      : d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null;
  return {
    runtime_min: runtime ? Number(runtime) : null,
    genres: ((d.genres ?? []) as any[]).map((g) => g.id as number),
  };
}

import { genreIdFor, type GenreKey } from "./genre-filter";
export type CatalogKind = "all" | "movie" | "tv";
export type SortKey = "popularity" | "rating" | "rating_low" | "recent" | "oldest";

export async function getTrending(
  lang: string,
  window: "day" | "week" = "week",
  kind: CatalogKind = "all"
): Promise<TmdbItem[]> {
  const data = await tmdb(`/trending/${kind}/${window}`, lang);
  // En /trending/movie y /trending/tv los resultados no traen "media_type": se fuerza.
  const forced = kind === "all" ? undefined : kind;
  return (data.results as any[]).map((r) => normalize(r, forced)).filter(Boolean) as TmdbItem[];
}

const SORT_PARAM: Record<MediaType, Record<SortKey, string>> = {
  movie: {
    popularity: "popularity.desc",
    rating: "vote_average.desc",
    rating_low: "vote_average.asc",
    recent: "primary_release_date.desc",
    oldest: "primary_release_date.asc",
  },
  tv: {
    popularity: "popularity.desc",
    rating: "vote_average.desc",
    rating_low: "vote_average.asc",
    recent: "first_air_date.desc",
    oldest: "first_air_date.asc",
  },
};

async function discoverOne(type: MediaType, sort: SortKey, page: number, lang: string, genre?: GenreKey) {
  const today = new Date().toISOString().slice(0, 10);
  const params: Record<string, string> = {
    sort_by: SORT_PARAM[type][sort],
    page: String(page),
    include_adult: "false",
  };
  // Mejor valoradas: se exige un mínimo de votos para que no ganen títulos con 1 voto.
  if (sort === "rating") params["vote_count.gte"] = type === "movie" ? "500" : "300";
  // Nota más baja: también con mínimo de votos, para que no salgan títulos desconocidos con 1 voto.
  if (sort === "rating_low") params["vote_count.gte"] = type === "movie" ? "500" : "300";
  // Más antiguas: clásicos con un mínimo de votos.
  if (sort === "oldest") params["vote_count.gte"] = "200";
  if (genre) {
    const gid = genreIdFor(genre, type);
    if (gid === null) return { items: [] as TmdbItem[], totalPages: 1 }; // ese género no existe para este tipo
    params.with_genres = String(gid);
  }
  // Más recientes: solo lo ya estrenado y con algo de actividad.
  if (sort === "recent") {
    params[type === "movie" ? "primary_release_date.lte" : "first_air_date.lte"] = today;
    params["vote_count.gte"] = "5";
  }

  const data = await tmdb(`/discover/${type}`, lang, params);
  const items = (data.results as any[])
    .filter((r) => r.poster_path)
    .map((r) => normalize(r, type))
    .filter(Boolean) as TmdbItem[];
  return { items, totalPages: Math.min(Number(data.total_pages) || 1, 500) };
}

// Catálogo paginado. TMDB deja recorrer como máximo 500 páginas (unos 10.000 títulos) por listado.
// En modo "all" se intercalan películas y series.
export async function getDiscover(
  kind: CatalogKind,
  sort: SortKey,
  page: number,
  lang: string,
  genre?: GenreKey
): Promise<{ items: TmdbItem[]; totalPages: number }> {
  const p = Math.min(Math.max(1, Math.floor(page) || 1), 500);

  if (kind === "all") {
    const [m, t] = await Promise.all([
      discoverOne("movie", sort, p, lang, genre),
      discoverOne("tv", sort, p, lang, genre),
    ]);
    const items: TmdbItem[] = [];
    const n = Math.max(m.items.length, t.items.length);
    for (let i = 0; i < n; i++) {
      if (m.items[i]) items.push(m.items[i]);
      if (t.items[i]) items.push(t.items[i]);
    }
    // si un tipo no tiene ese género, se usan las páginas del otro
    const pages = m.items.length === 0 ? t.totalPages : t.items.length === 0 ? m.totalPages : Math.min(m.totalPages, t.totalPages);
    return { items, totalPages: pages };
  }
  return discoverOne(kind, sort, p, lang, genre);
}

export async function searchTitles(q: string, lang: string): Promise<TmdbItem[]> {
  if (!q.trim()) return [];
  const data = await tmdb("/search/multi", lang, { query: q, include_adult: "false" });
  return (data.results as any[]).map((r) => normalize(r)).filter(Boolean) as TmdbItem[];
}

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  credits: TmdbItem[];
};

export async function getPerson(id: number, lang: string): Promise<TmdbPerson | null> {
  let p: any;
  try {
    p = await tmdb(`/person/${id}`, lang, { append_to_response: "combined_credits" });
  } catch {
    return null;
  }

  // Si no hay biografía en el idioma elegido, se usa la inglesa como respaldo.
  let biography: string = p.biography ?? "";
  if (!biography && lang !== "en") {
    try {
      const en = await tmdb(`/person/${id}`, "en");
      biography = en.biography ?? "";
    } catch {}
  }

  const rawCredits: any[] = [
    ...(p.combined_credits?.cast ?? []),
    ...(p.combined_credits?.crew ?? []).filter((c: any) => c.job === "Director"),
  ];
  const seen = new Set<string>();
  const credits: TmdbItem[] = [];
  for (const c of rawCredits
    .filter((c) => (c.media_type === "movie" || c.media_type === "tv") && c.poster_path)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))) {
    const item = normalize(c);
    if (!item) continue;
    const key = `${item.media_type}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    credits.push(item);
    if (credits.length >= 24) break;
  }

  return {
    id: p.id,
    name: p.name ?? "",
    biography,
    birthday: p.birthday ?? null,
    deathday: p.deathday ?? null,
    place_of_birth: p.place_of_birth ?? null,
    profile_path: p.profile_path ?? null,
    known_for_department: p.known_for_department ?? "",
    credits,
  };
}

export async function getDetail(
  type: MediaType,
  id: number,
  lang: string
): Promise<TmdbDetail | null> {
  let d: any;
  try {
    d = await tmdb(`/${type}/${id}`, lang, {
      append_to_response: "credits,videos,watch/providers",
    });
  } catch {
    return null;
  }
  const base = normalize({ ...d, media_type: type }, type)!;
  const genreIds: number[] = (d.genres ?? []).map((g: any) => g.id);

  // TMDB no tiene "anime" ni "documental" como tipo: se deduce por género (y idioma original).
  let kind: TmdbDetail["kind"] = type;
  if (genreIds.includes(99)) kind = "documentary";
  else if (genreIds.includes(16) && d.original_language === "ja") kind = "anime";

  const videos: any[] = d.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube");

  const region = d["watch/providers"]?.results?.[lang === "en" ? "US" : "ES"];
  const providers = (region?.flatrate ?? []).map((p: any) => ({
    name: p.provider_name,
    logo_path: p.logo_path ?? null,
  }));

  return {
    ...base,
    backdrop_path: d.backdrop_path ?? null,
    overview: d.overview ?? "",
    tagline: d.tagline ?? "",
    genres: d.genres ?? [],
    runtime: type === "movie" ? d.runtime ?? null : d.episode_run_time?.[0] ?? null,
    seasons: type === "tv" ? d.number_of_seasons ?? null : null,
    episodes: type === "tv" ? d.number_of_episodes ?? null : null,
    original_language: d.original_language ?? "",
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path ?? null,
    })),
    trailerKey: trailer?.key ?? null,
    providers,
    providersLink: region?.link ?? null,
    kind,
  };
}

// ---------------------------------------------------------------- próximos estrenos

export type Upcoming =
  | { kind: "tv_next"; date: string | null; season: number; episode: number }
  | { kind: "tv_returning" }
  | { kind: "tv_planned" }
  | { kind: "tv_ended" }
  | { kind: "tv_canceled" }
  | { kind: "movie_unreleased"; date: string | null }
  | { kind: "movie_sequel"; id: number; title: string; date: string | null }
  | { kind: "movie_none" };

// Qué viene después: siguiente capítulo/temporada (series) o estreno/secuela (películas). Datos de TMDB.
export async function getUpcoming(type: MediaType, id: number, lang: string): Promise<Upcoming | null> {
  try {
    const d: any = await tmdb(`/${type}/${id}`, lang);
    const today = new Date().toISOString().slice(0, 10);

    if (type === "tv") {
      const next = d.next_episode_to_air;
      if (next) {
        return {
          kind: "tv_next",
          date: next.air_date || null,
          season: next.season_number ?? 1,
          episode: next.episode_number ?? 1,
        };
      }
      const status: string = d.status ?? "";
      if (status === "Canceled") return { kind: "tv_canceled" };
      if (status === "Planned") return { kind: "tv_planned" };
      if (status === "Returning Series" || status === "In Production" || d.in_production) {
        return { kind: "tv_returning" };
      }
      return { kind: "tv_ended" };
    }

    // Película
    const status: string = d.status ?? "";
    const release: string = d.release_date ?? "";
    if (status !== "Released" && status !== "Canceled") {
      return { kind: "movie_unreleased", date: release || null };
    }
    if (d.belongs_to_collection?.id) {
      const col: any = await tmdb(`/collection/${d.belongs_to_collection.id}`, lang);
      const upcoming = ((col.parts ?? []) as any[])
        .filter((p) => p.id !== id && (!p.release_date || p.release_date > today))
        .sort((a, b) => String(a.release_date || "9999").localeCompare(String(b.release_date || "9999")))[0];
      if (upcoming) {
        return { kind: "movie_sequel", id: upcoming.id, title: upcoming.title, date: upcoming.release_date || null };
      }
    }
    return { kind: "movie_none" };
  } catch {
    return null;
  }
}

// Títulos parecidos: primero las recomendaciones de TMDB y, si no hay, los "similares".
export async function getRelated(type: MediaType, id: number, lang: string): Promise<TmdbItem[]> {
  try {
    let res: any = await tmdb(`/${type}/${id}/recommendations`, lang);
    let list: any[] = res.results ?? [];
    if (list.length < 6) {
      res = await tmdb(`/${type}/${id}/similar`, lang);
      const seen = new Set(list.map((r) => r.id));
      list = [...list, ...(res.results ?? []).filter((r: any) => !seen.has(r.id))];
    }
    return list
      .filter((r) => r.poster_path)
      .slice(0, 14)
      .map((r) => normalize(r, type))
      .filter((x): x is TmdbItem => x !== null);
  } catch {
    return [];
  }
}
