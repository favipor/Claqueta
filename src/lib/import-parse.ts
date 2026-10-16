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

// Convierte la tabla del Excel (filas de celdas) en filas de importación.
// Devuelve null si no encuentra una cabecera con "NOMBRE".
export function parseTable(table: unknown[][]): ImportRow[] | null {
  const headerIdx = table.findIndex((r) =>
    r.some((c) => /^(nombre|titulo)$/.test(strip(String(c ?? "")).trim()))
  );
  if (headerIdx === -1) return null;

  const header = table[headerIdx].map((c) => strip(String(c ?? "")).trim());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const cName = col(/^(nombre|titulo)$/);
  const cType = col(/^tipo/);
  const cStatus = col(/^(visualizacion|estado)/);
  const cRating = col(/^nota/);

  const rows: ImportRow[] = [];
  for (const r of table.slice(headerIdx + 1)) {
    const name = String(r[cName] ?? "").trim();
    if (!name) continue;

    const type = cType >= 0 ? String(r[cType] ?? "").trim() : "";
    const t = strip(type);
    const hint: "movie" | "tv" = t.startsWith("serie") || t.startsWith("anime") || t.startsWith("doc") ? "tv" : "movie";

    const c = cleanName(name, hint);
    if (!c.query) continue;

    const status = parseStatus(cStatus >= 0 ? r[cStatus] : "");
    const rating = parseRating(cRating >= 0 ? r[cRating] : null);

    rows.push({
      id: rows.length,
      raw: {
        name,
        type,
        status: cStatus >= 0 ? String(r[cStatus] ?? "").trim() : "",
        rating,
      },
      qkey: `${c.hint}|${normalizeKey(c.query)}|${c.year ?? ""}`,
      query: c.query,
      alt: c.alt,
      year: c.year,
      hint: c.hint,
      season: c.season,
      status,
      rating,
    });
  }
  return rows;
}
