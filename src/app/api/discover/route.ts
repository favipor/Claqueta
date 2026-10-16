import { NextResponse } from "next/server";
import { getDiscover, type CatalogKind, type SortKey } from "@/lib/tmdb";
import { getLang } from "@/lib/i18n-server";

const KINDS: CatalogKind[] = ["all", "movie", "tv"];
const SORTS: SortKey[] = ["popularity", "rating", "recent"];

// Devuelve una página del catálogo. La clave de TMDB se queda en el servidor.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kind = sp.get("kind") as CatalogKind;
  const sort = sp.get("sort") as SortKey;
  const page = Number(sp.get("page") ?? "1");

  if (!KINDS.includes(kind) || !SORTS.includes(sort) || !Number.isFinite(page)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const lang = await getLang();
    const data = await getDiscover(kind, sort, page, lang);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
