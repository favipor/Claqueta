import { NextResponse } from "next/server";
import { getDiscover, type CatalogKind, type SortKey } from "@/lib/tmdb";
import { isGenreKey } from "@/lib/genre-filter";
import { getLang } from "@/lib/i18n-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const KINDS: CatalogKind[] = ["all", "movie", "tv"];
const SORTS: SortKey[] = ["popularity", "rating", "rating_low", "recent", "oldest"];

// Devuelve una página del catálogo. La clave de TMDB se queda en el servidor.
export async function GET(request: Request) {
  if (!rateLimit(`discover:${clientIp(request)}`, 60, 20_000)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": "20" } });
  }
  const sp = new URL(request.url).searchParams;
  const kind = sp.get("kind") as CatalogKind;
  const sort = sp.get("sort") as SortKey;
  const page = Number(sp.get("page") ?? "1");
  const g = sp.get("genre");
  const genre = isGenreKey(g) ? g : undefined;
  // Plataformas: lista de números separados por comas (como mucho 30)
  const providers = (sp.get("providers") ?? "")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 30);

  if (!KINDS.includes(kind) || !SORTS.includes(sort) || !Number.isFinite(page)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const lang = await getLang();
    const data = await getDiscover(kind, sort, page, lang, genre, providers);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
