import type { Status } from "./dict";
import type { ImportRow } from "./import-types";

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function normalizeKey(s: string): string {
  return strip(s).replace(/[^a-z0-9]+/g, " ").trim();
}

function parseStatus(v: unknown): Status {
  const s = strip(String(v ?? "")).trim();
  if (s.startsWith("visto")) return "visto";
  if (s.startsWith("viendo")) return "viendo";
  if (s.startsWith("volver")) return "volver_a_ver";
  return "pendiente";
}

function parseRating(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const r = Math.round(Math.min(10, Math.max(0, n)) * 2) / 2;
  return r;
}

// Limpia el nombre: quita asteriscos, "(serie)", años, marcas de temporada (T2)…
export function cleanName(
  rawName: string,
  hint: "movie" | "tv"
): { query: string; alt: string | null; year: string | null; season: number | null; hint: "movie" | "tv" } {
  let s = rawName.replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
  let season: number | null = null;
  let year: string | null = null;
  let h = hint;

  // Si el nombre dice "(serie)" o "(anime)", es una serie aunque la columna TIPO diga otra cosa
  if (/\(\s*(serie|series|anime)\s*\)/i.test(s) || /\s(serie|series)\s*$/i.test(s)) h = "tv";

  // Año entre paréntesis: "Nosferatu (2024)"
  const y = s.match(/\(\s*((?:19|20)\d{2})\s*\)/);
  if (y) {
    year = y[1];
    s = s.replace(y[0], " ");
  }

  // Temporada: "(T2)" o "T2" al final (solo en series: en una película podría ser parte del título)
  if (h === "tv") {
    const p = s.match(/\(\s*T\s?(\d{1,2})\s*\)/i);
    if (p) {
      season = Number(p[1]);
      s = s.replace(p[0], " ");
    } else {
      const e = s.match(/\s+T\s?(\d{1,2})\s*$/i);
      if (e) {
        season = Number(e[1]);
        s = s.replace(e[0], " ");
      }
    }
  }

  // "PELI" indica que es la película de una serie/anime
  if (/\bpeli\b/i.test(s)) {
    h = "movie";
    season = null;
    s = s.replace(/\bpeli\b/gi, " ");
  }

  // Texto entre paréntesis: se quita; si no es una etiqueta típica, se guarda como búsqueda alternativa
  let alt: string | null = null;
  const tags = /^(serie|series|anime|peli|pelicula|película|documental|live action|netflix|hbo|disney|amazon)\b/i;
  s = s.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    const t = inner.trim();
    if (t && !tags.test(t) && !alt) alt = t;
    return " ";
  });

  // "El problema de los tres cuerpos serie" → sin "serie" al final
  s = s.replace(/\s+(serie|series|anime)\s*$/i, " ");

  const query = s.replace(/\s+/g, " ").trim();
  return { query, alt, year, season, hint: h };
}

// CSV (Letterboxd, IMDb, TV Time...) → tabla de celdas. Admite comillas y comas dentro de los campos.
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const sep = (t.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) > (t.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Fecha en formatos típicos (2024-05-31, 31/05/2024, 2024-05-31T20:00:00Z...) → AAAA-MM-DD
function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

type Source = "excel" | "letterboxd" | "imdb" | "tvtime";

// Convierte la tabla (Excel o CSV) en filas de importación. Reconoce:
//  · tu Excel (NOMBRE, TIPO, VISUALIZACION, NOTA)
//  · Letterboxd (watched.csv, ratings.csv, diary.csv, watchlist.csv)
//  · IMDb (ratings.csv, watchlist.csv)
//  · TV Time (archivos con el nombre de la serie)
// Devuelve null si no encuentra una columna con el nombre del título.
export function parseTable(table: unknown[][], fileName = ""): ImportRow[] | null {
  const norm = (c: unknown) => strip(String(c ?? "")).replace(/_/g, " ").trim();
  const NAME = /^(nombre|titulo|name|title|series name|tv show name|show name|serie|movie name|film name)$/;
  const headerIdx = table.findIndex((r) => r.some((c) => NAME.test(norm(c))));
  if (headerIdx === -1) return null;

  const header = table[headerIdx].map(norm);
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const file = fileName.toLowerCase();

  const source: Source = header.includes("letterboxd uri")
    ? "letterboxd"
    : header.includes("const") && (header.includes("title type") || header.includes("your rating"))
      ? "imdb"
      : header.some((h) => /^(series name|tv show name|show name)$/.test(h))
        ? "tvtime"
        : "excel";

  const cName = col(NAME);
  const cType = col(source === "imdb" ? /^title type$/ : /^tipo/);
  const cStatus = col(/^(visualizacion|estado)/);
  const cRating = col(source === "imdb" ? /^your rating$/ : source === "letterboxd" ? /^rating$/ : /^(nota|rating)$/);
  const cYear = col(/^(year|ano|anio)$/);
  const cDate = col(/^(watched date|date rated|fecha|fecha visto|date)$/);
  const isWatchlist = file.includes("watchlist");

  const rows: ImportRow[] = [];
  for (const r of table.slice(headerIdx + 1)) {
    const name = String(r[cName] ?? "").trim();
    if (!name) continue;

    const type = cType >= 0 ? String(r[cType] ?? "").trim() : "";
    const t = strip(type);
    if (source === "imdb" && /episode|video game|podcast|music video/.test(t)) continue; // capítulos sueltos, juegos...
    let hint: "movie" | "tv";
    if (source === "letterboxd") hint = "movie";
    else if (source === "tvtime") hint = "tv";
    else if (source === "imdb") hint = /series|tv mini|tv show/.test(t) ? "tv" : "movie";
    else hint = t.startsWith("serie") || t.startsWith("anime") || t.startsWith("doc") ? "tv" : "movie";

    const c = cleanName(name, hint);
    if (!c.query) continue;
    const year = c.year ?? (cYear >= 0 && /^(19|20)\d{2}$/.test(String(r[cYear] ?? "").trim()) ? String(r[cYear]).trim() : null);

    let rating = parseRating(cRating >= 0 ? r[cRating] : null);
    if (rating !== null && source === "letterboxd") rating = Math.min(10, rating * 2); // Letterboxd puntúa de 0,5 a 5
    if (rating === 0) rating = null;
    const watchedOn = cDate >= 0 ? parseDate(r[cDate]) : null;

    // Estado: el del Excel; en Letterboxd/IMDb lo que está en la watchlist es «Pendiente» y el resto «Visto»
    let status: Status;
    if (source === "excel") status = parseStatus(cStatus >= 0 ? r[cStatus] : "");
    else if (source === "tvtime") status = cStatus >= 0 ? parseStatus(r[cStatus]) : "viendo";
    else status = isWatchlist || (source === "imdb" && cRating < 0) ? "pendiente" : "visto";

    rows.push({
      id: rows.length,
      raw: {
        name: year && !name.includes(year) ? `${name} (${year})` : name,
        type,
        status: cStatus >= 0 ? String(r[cStatus] ?? "").trim() : status,
        rating,
      },
      qkey: `${c.hint}|${normalizeKey(c.query)}|${year ?? ""}`,
      query: c.query,
      alt: c.alt,
      year,
      hint: c.hint,
      season: c.season,
      status,
      rating,
      watchedOn,
    });
  }
  return rows;
}
