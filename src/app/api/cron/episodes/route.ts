import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Tarea diaria (Vercel Cron, ver vercel.json): mira las series que alguien está viendo y,
// si ayer u hoy se estrenó un capítulo, avisa a quien la sigue (notificación + push).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "no_service_key" }, { status: 500 });

  const { data: rows, error } = await admin.rpc("watching_series");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = ((rows ?? []) as { tmdb_id: number }[]).map((r) => r.tmdb_id).slice(0, 500);

  const today = new Date();
  const days = new Set(
    [0, 1].map((d) => new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10))
  );

  let aired = 0;
  let notified = 0;
  // De 8 en 8 para no saturar TMDB
  for (let i = 0; i < ids.length; i += 8) {
    await Promise.all(
      ids.slice(i, i + 8).map(async (id) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?language=es-ES`, {
            headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`, accept: "application/json" },
            cache: "no-store",
          });
          if (!res.ok) return;
          const d = await res.json();
          const date: string | undefined = d.last_episode_to_air?.air_date;
          if (!date || !days.has(date)) return;
          aired++;
          const { data: n } = await admin.rpc("notify_new_episode", { p_tmdb_id: id });
          notified += Number(n) || 0;
        } catch {
          // una serie que falle no para el resto
        }
      })
    );
  }

  return NextResponse.json({ ok: true, checked: ids.length, aired, notified });
}
