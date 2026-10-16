import { NextResponse } from "next/server";
import { getSeasonEpisodes } from "@/lib/tmdb";
import { getLang } from "@/lib/i18n-server";

// Devuelve los capítulos de una temporada (se pide al desplegarla en la ficha de la serie).
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const id = Number(sp.get("id"));
  const season = Number(sp.get("season"));

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(season) || season < 0 || season > 999) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const lang = await getLang();
    const episodes = await getSeasonEpisodes(id, season, lang);
    return NextResponse.json({ episodes });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
