import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { Avatar } from "./Avatar";

type Row = { user_id: string; username: string; display_name: string | null; avatar_url: string | null; episodes: number; movies: number; is_me: boolean };

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM = ["from-yellow-300 to-amber-500 h-24", "from-slate-200 to-slate-400 h-16", "from-orange-300 to-amber-700 h-12"];

// Ranking de la semana entre tú y la gente que sigues (solo quien comparte su actividad)
export async function FriendsRanking({ hidden }: { hidden: boolean }) {
  const { lang } = await getT();
  const L = lang === "en";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("friends_ranking");
  if (error) return null; // falta phase12.sql
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, total: r.episodes + r.movies })).filter((r) => r.total > 0 || r.is_me);
  if (rows.filter((r) => r.total > 0).length < 2 && !rows.some((r) => r.is_me && r.total > 0)) return null;
  const top = rows.slice(0, 3);
  const rest = rows.slice(3, 8);
  const order = [1, 0, 2].filter((k) => top[k]); // podio: 2º, 1º, 3º
  const name = (r: Row) => (r.is_me ? (L ? "You" : "Tú") : r.display_name ?? `@${r.username}`);
  const line = (r: Row & { total: number }) =>
    [r.episodes ? (L ? `${r.episodes} ep.` : `${r.episodes} cap.`) : null, r.movies ? (L ? `${r.movies} movies` : `${r.movies} pelis`) : null].filter(Boolean).join(" · ") || "—";

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-fuchsia-800 p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold">🏆 {L ? "This week among friends" : "Esta semana entre amigos"}</h2>
        <p className="text-xs text-white/70">{L ? "Episodes + movies watched since Monday" : "Capítulos y pelis vistos desde el lunes"}</p>
      </div>
      <div className="mt-4 flex items-end justify-center gap-3">
        {order.map((k) => {
          const r = top[k];
          return (
            <Link key={r.user_id} href={`/u/${r.username}`} className="flex w-24 flex-col items-center text-center sm:w-28">
              <span className="text-2xl" aria-hidden="true">
                {MEDAL[k]}
              </span>
              <span className={`rounded-full ${r.is_me ? "ring-4 ring-amber-300" : "ring-2 ring-white/60"}`}>
                <Avatar url={r.avatar_url} size={k === 0 ? 56 : 46} />
              </span>
              <span className="mt-1 w-full truncate text-sm font-bold">{name(r)}</span>
              <span className="text-[11px] text-white/80">{line(r)}</span>
              <span className={`mt-2 w-full rounded-t-xl bg-gradient-to-b ${PODIUM[k]} grid place-items-start justify-center pt-1 text-lg font-black text-black/60`}>{r.total}</span>
            </Link>
          );
        })}
      </div>
      {rest.length > 0 && (
        <ol start={4} className="mt-3 space-y-1.5 rounded-2xl bg-black/20 p-2">
          {rest.map((r, i) => (
            <li key={r.user_id}>
              <Link href={`/u/${r.username}`} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-white/10 ${r.is_me ? "bg-white/15" : ""}`}>
                <span className="w-5 text-center font-bold text-white/70">{i + 4}</span>
                <Avatar url={r.avatar_url} size={28} />
                <span className="min-w-0 flex-1 truncate font-semibold">{name(r)}</span>
                <span className="text-xs text-white/80">{line(r)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {hidden && <p className="mt-3 text-xs text-white/75">🙈 {L ? "You don't appear because your activity is hidden." : "Tú no apareces porque tienes tu actividad oculta."}</p>}
    </section>
  );
}
