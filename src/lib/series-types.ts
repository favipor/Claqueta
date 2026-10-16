import type { Status } from "./dict";

export type SeasonStatus = "pendiente" | "viendo" | "visto";

// Foto completa del seguimiento de una serie para un usuario.
export type TvState = {
  seriesStatus: Status | null;
  seasons: Record<number, SeasonStatus>; // sin entrada = pendiente
  watched: string[]; // capítulos vistos, como "temporada-capítulo" (ej. "2-5")
};

export type TvMeta = { tmdb_id: number; title: string; poster_path: string | null };

export type TvActionResult = { ok: boolean; state?: TvState; error?: string };
