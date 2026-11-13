import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { filterByProviders, getAirSchedule, getUpcomingMovies, type AirItem, type MediaType } from "@/lib/tmdb";
import { CalendarView, type CalEvent, type CalMode } from "@/components/CalendarView";
import { cookies } from "next/headers";
import { PREF_COOKIES, withSavedPrefs } from "@/lib/prefs";

export const metadata = { title: "Calendario", robots: { index: false } };

const pad = (n: number) => String(n).padStart(2, "0");

// Calendario: próximos estrenos de lo que sigues y/o lo que has visto cada día (diario)
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ver?: string; cine?: string; prov?: string }>;
}) {
  // Si no vienen filtros en la dirección, se usan los que dejaste la última vez
  const sp = withSavedPrefs(await searchParams, (await cookies()).get(PREF_COOKIES.calendar)?.value, ["ver", "cine", "prov"]);
  const { lang } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(sp.mes ?? "");
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Math.min(12, Math.max(1, Number(m[2]))) : now.getMonth() + 1;
  const mode: CalMode = sp.ver === "estrenos" || sp.ver === "visto" ? sp.ver : "ambos";
  const cinema = sp.cine === "1";
  const { data: prof } = await supabase.from("profiles").select("providers").eq("id", user.id).maybeSingle();
  const myProviders = ((prof?.providers as number[] | null) ?? []).filter(Number.isInteger);
  const onlyMine = sp.prov === "1" && myProviders.length > 0;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${year}-${pad(month)}-01`;
  const to = `${year}-${pad(month)}-${pad(last)}`;

  const events: CalEvent[] = [];

  // ---- Lo que has visto (diario) ----
  if (mode !== "estrenos") {
    const [{ data: titles }, { data: eps }] = await Promise.all([
      supabase
        .from("user_titles")
        .select("tmdb_id, media_type, title, poster_path, watched_on, rating")
        .eq("user_id", user.id)
        .gte("watched_on", from)
        .lte("watched_on", to),
      supabase
        .from("user_episodes")
        .select("tmdb_id, season_number, episode_number, watched_at")
        .eq("user_id", user.id)
        .gte("watched_at", `${from}T00:00:00Z`)
        .lte("watched_at", `${to}T23:59:59Z`)
        .limit(3000),
    ]);
    for (const r of titles ?? []) {
      events.push({
        kind: "seen",
        date: r.watched_on as string,
        tmdb_id: r.tmdb_id as number,
        media_type: r.media_type as MediaType,
        title: r.title as string,
        poster_path: (r.poster_path as string | null) ?? null,
        label: r.rating !== null && r.rating !== undefined ? `★ ${Number(r.rating)}` : "",
      });
    }
    // Capítulos: se agrupan por serie y día («3 capítulos»)
    const groups = new Map<string, { date: string; tmdb_id: number; eps: string[] }>();
    for (const e of eps ?? []) {
      const date = String(e.watched_at).slice(0, 10);
      const k = `${date}|${e.tmdb_id}`;
      const g = groups.get(k) ?? { date, tmdb_id: e.tmdb_id as number, eps: [] };
      g.eps.push(`T${e.season_number}E${e.episode_number}`);
      groups.set(k, g);
    }
    if (groups.size) {
      const ids = [...new Set([...groups.values()].map((g) => g.tmdb_id))];
      const { data: names } = await supabase
        .from("user_titles")
        .select("tmdb_id, title, poster_path")
        .eq("user_id", user.id)
        .eq("media_type", "tv")
        .in("tmdb_id", ids);
      const byId = new Map((names ?? []).map((n) => [n.tmdb_id as number, n]));
      for (const g of groups.values()) {
        const n = byId.get(g.tmdb_id);
        events.push({
          kind: "seen",
          date: g.date,
          tmdb_id: g.tmdb_id,
          media_type: "tv",
          title: (n?.title as string) ?? "?",
          poster_path: (n?.poster_path as string | null) ?? null,
          label: g.eps.length === 1 ? g.eps[0] : `${g.eps.length} ${lang === "en" ? "episodes" : "capítulos"}`,
        });
      }
    }
  }

  // ---- Próximos estrenos de lo que sigues ----
  if (mode !== "visto") {
    const [{ data: series }, { data: movies }] = await Promise.all([
      supabase
        .from("user_titles")
        .select("tmdb_id")
        .eq("user_id", user.id)
        .eq("media_type", "tv")
        .in("status", ["viendo", "pendiente", "volver_a_ver"])
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("user_titles")
        .select("tmdb_id")
        .eq("user_id", user.id)
        .eq("media_type", "movie")
        .eq("status", "pendiente")
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);
    // «Solo en mis plataformas»: se quitan los títulos que no están en ninguna de tus plataformas
    type Row = { tmdb_id: number; media_type: MediaType };
    let followed: Row[] = [
      ...(series ?? []).map((s) => ({ tmdb_id: s.tmdb_id as number, media_type: "tv" as const })),
      ...(movies ?? []).map((s) => ({ tmdb_id: s.tmdb_id as number, media_type: "movie" as const })),
    ];
    if (onlyMine) followed = await filterByProviders(followed, myProviders, (r) => r.tmdb_id);
    const lists = await Promise.all([
      ...followed.map((r) => getAirSchedule(r.media_type, r.tmdb_id, lang, from, to)),
      cinema ? getUpcomingMovies(lang, from, to) : Promise.resolve([] as AirItem[]),
    ]);
    const seen = new Set<string>();
    for (const it of lists.flat()) {
      const k = `${it.date}|${it.media_type}|${it.tmdb_id}|${it.label}`;
      if (seen.has(k)) continue;
      seen.add(k);
      events.push({ kind: "release", ...it });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return <CalendarView year={year} month={month} mode={mode} cinema={cinema} events={events} onlyMine={onlyMine} hasProviders={myProviders.length > 0} />;
}
