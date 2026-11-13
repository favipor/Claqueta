import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { loadYearSummary, parseYear, totalHours } from "@/lib/year-summary";
import { genreName } from "@/lib/genres";

// Imagen vertical (1080×1920) del resumen del año para historias de Instagram y estados de WhatsApp.
// Usa la sesión de quien la pide, así que también funciona con perfiles privados (el tuyo, o si te aceptaron).
export async function GET(_req: Request, { params }: { params: Promise<{ username: string; year: string }> }) {
  const p = await params;
  const username = decodeURIComponent(p.username).toLowerCase();
  const year = parseYear(p.year) ?? new Date().getUTCFullYear();
  const supabase = await createClient();
  const { profile, summary } = await loadYearSummary(supabase, username, year).catch(() => ({ profile: null, summary: null }));
  if (!profile || !summary) return new Response("No disponible", { status: 404 });
  const name = profile.display_name ?? `@${username}`;
  const top = summary.top.filter((x) => x.poster_path).slice(0, 3);
  const fav = summary.genres[0] ? genreName(summary.genres[0].id, "es") : null;

  const stat = (value: string, label: string, color: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 440, padding: "34px 0", borderRadius: 40, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.18)" }}>
      <div style={{ display: "flex", fontSize: 120, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 38, marginTop: 10, opacity: 0.85 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "110px 70px 90px",
          background: "linear-gradient(160deg, #0d9488 0%, #115e59 35%, #042f2e 70%, #020617 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 46, fontWeight: 800, opacity: 0.95 }}>🎬 Claqueta</div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 70, opacity: 0.85 }}>{name}</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4, lineHeight: 1, marginTop: 10 }}>{`Mi ${year}`}</div>
        <div style={{ display: "flex", fontSize: 50, color: "#99f6e4", marginTop: 14 }}>en pelis y series</div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 30, marginTop: 70, width: 940 }}>
          {stat(String(totalHours(summary)), "horas", "#5eead4")}
          {stat(String(summary.movies), "películas", "#fbbf24")}
          {stat(String(summary.series), "series", "#f9a8d4")}
          {stat(String(summary.episodes), "capítulos", "#c4b5fd")}
        </div>

        {fav ? (
          <div style={{ display: "flex", marginTop: 50, fontSize: 40, background: "rgba(255,255,255,0.15)", padding: "16px 40px", borderRadius: 999 }}>{`❤️ Mi género: ${fav}`}</div>
        ) : null}

        {top.length ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#fde68a" }}>🏆 Mis favoritas</div>
            <div style={{ display: "flex", gap: 30, marginTop: 26 }}>
              {top.map((x) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={x.tmdb_id} src={`https://image.tmdb.org/t/p/w342${x.poster_path}`} width={250} height={375} style={{ borderRadius: 26, border: "4px solid rgba(255,255,255,0.35)" }} />
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: "auto", fontSize: 40, fontWeight: 700, color: "#99f6e4" }}>miclaqueta.com</div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
