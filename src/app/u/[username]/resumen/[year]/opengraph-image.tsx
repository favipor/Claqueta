import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { loadYearSummary, parseYear, totalHours } from "@/lib/year-summary";
import { genreName } from "@/lib/genres";

// Imagen para compartir el resumen del año (WhatsApp, redes...). Solo con perfiles públicos.
export const alt = "Resumen del año en Claqueta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ username: string; year: string }> }) {
  const p = await params;
  const username = decodeURIComponent(p.username).toLowerCase();
  const year = parseYear(p.year) ?? new Date().getUTCFullYear();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { profile, summary } = await loadYearSummary(supabase, username, year).catch(() => ({ profile: null, summary: null }));
  const name = profile?.display_name ?? `@${username}`;

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px" }}>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 800 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>{label}</div>
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
          justifyContent: "center",
          background: "linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0d9488 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>{name}</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -2, marginTop: 6 }}>{`Mi ${year} en Claqueta`}</div>
        {summary ? (
          <div style={{ display: "flex", marginTop: 40 }}>
            {stat(String(totalHours(summary)), "horas")}
            {stat(String(summary.movies), "películas")}
            {stat(String(summary.series), "series")}
            {stat(String(summary.episodes), "capítulos")}
          </div>
        ) : null}
        {summary && summary.genres[0] ? (
          <div style={{ display: "flex", marginTop: 34, fontSize: 30, background: "rgba(255,255,255,0.15)", padding: "10px 28px", borderRadius: 999 }}>
            {`Género favorito: ${genreName(summary.genres[0].id, "es")}`}
          </div>
        ) : null}
      </div>
    ),
    size
  );
}
