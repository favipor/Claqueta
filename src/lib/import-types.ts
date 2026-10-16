import type { Status } from "./dict";
import type { SeasonStatus } from "./series-types";

// Una fila del Excel ya limpia
export type ImportRow = {
  id: number;
  raw: { name: string; type: string; status: string; rating: number | null };
  qkey: string; // filas que buscan lo mismo comparten clave (p. ej. Overlord T1, T2, T3...)
  query: string;
  alt: string | null; // segunda búsqueda posible (texto entre paréntesis)
  year: string | null;
  hint: "movie" | "tv";
  season: number | null; // número de temporada si el nombre acababa en T1, T2…
  status: Status;
  rating: number | null;
};

export type MatchQuery = {
  qkey: string;
  query: string;
  alt: string | null;
  year: string | null;
  hint: "movie" | "tv";
};

export type Candidate = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: string;
  poster_path: string | null;
  score: number;
};

export type MatchResult = {
  qkey: string;
  candidates: Candidate[];
  auto: boolean; // coincidencia clara: entra sin revisar
};

// Lo que se guarda de verdad (ya con la ficha de TMDB elegida)
export type ImportItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  status: Status | null; // película: su estado. Serie: estado de la fila sin temporada
  rating: number | null;
  seasons: Record<number, SeasonStatus>; // series: estado de las filas con T1, T2…
};

export type ImportBatchResult = {
  imported: number;
  skipped: number; // ya estaban en tu lista con estado
  failed: string[];
};
