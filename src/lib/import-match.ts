import { searchCandidates, type SearchCandidate } from "./tmdb";
import { normalizeKey } from "./import-parse";
import type { Candidate, MatchQuery, MatchResult } from "./import-types";

function sim(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = new Set(a.split(" "));
  const B = new Set(b.split(" "));
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  const jaccard = inter / (A.size + B.size - inter);
  const prefix = a.startsWith(b + " ") || b.startsWith(a + " ") ? 0.75 : 0;
  return Math.max(jaccard * 0.9, prefix);
}

function score(query: string, c: SearchCandidate): number {
  const q = normalizeKey(query);
  return Math.max(sim(q, normalizeKey(c.title)), sim(q, normalizeKey(c.original_title)));
}

async function find(query: string, year: string | null, lang: string) {
  let res = await searchCandidates(query, lang, year);
  if (res.length === 0 && year) res = await searchCandidates(query, lang, null);
  return res;
}

export async function matchOne(q: MatchQuery, lang: string): Promise<MatchResult> {
  let pool = await find(q.query, q.year, lang);
  let scored = pool.map((c) => ({ c, s: score(q.query, c) }));

  // Si no hay coincidencia clara, se prueba con el texto entre paréntesis del Excel
  if (q.alt && !scored.some((x) => x.s >= 0.95)) {
    const extra = await find(q.alt, q.year, lang);
    const seen = new Set(pool.map((c) => `${c.media_type}-${c.id}`));
    for (const c of extra) {
      if (seen.has(`${c.media_type}-${c.id}`)) continue;
      scored.push({ c, s: Math.max(score(q.alt, c), score(q.query, c)) });
    }
  }

  const rank = (x: { c: SearchCandidate; s: number }) =>
    x.s + (x.c.media_type === q.hint ? 0.05 : 0) + (q.year && x.c.year === q.year ? 0.03 : 0);

  scored.sort((a, b) => rank(b) - rank(a) || b.c.popularity - a.c.popularity);
  const top = scored.slice(0, 6);

  const candidates: Candidate[] = top.map(({ c, s }) => ({
    id: c.id,
    media_type: c.media_type,
    title: c.title,
    year: c.year,
    poster_path: c.poster_path,
    score: s,
  }));

  // Clara = título idéntico, del tipo esperado y sin rival igual de bueno
  let auto = false;
  const first = top[0];
  if (first && first.s >= 0.999 && first.c.media_type === q.hint) {
    const ties = top.slice(1).filter((x) => x.s >= 0.999 && x.c.media_type === q.hint);
    auto =
      ties.length === 0 ||
      (!!q.year && first.c.year === q.year) ||
      first.c.popularity >= 2.5 * ties[0].c.popularity;
  }

  return { qkey: q.qkey, candidates, auto };
}
