import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { img } from "@/lib/tmdb";
import type { ActivityRow } from "@/app/profile-actions";
import { Avatar } from "./Avatar";

// «Lo que más se ve entre tus amigos»: títulos que más amigos han marcado esta semana, con su nota media
export async function FriendsTrending({ rows }: { rows: ActivityRow[] }) {
  const { lang } = await getT();
  const L = lang === "en";
  const since = Date.now() - 7 * 864e5;
  const map = new Map<string, { r: ActivityRow; people: ActivityRow[]; ratings: number[] }>();
  for (const r of rows) {
    if (new Date(r.at).getTime() < since) continue;
    const k = `${r.media_type}-${r.tmdb_id}`;
    const cur = map.get(k) ?? { r, people: [], ratings: [] };
    if (!cur.people.some((p) => p.user_id === r.user_id)) cur.people.push(r);
    if (r.rating !== null) cur.ratings.push(Number(r.rating));
    map.set(k, cur);
  }
  const top = [...map.values()].sort((a, b) => b.people.length - a.people.length || b.ratings.length - a.ratings.length).slice(0, 6);
  const posters = top.map((x) => x.r.poster_path).filter((p): p is string => !!p);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-neutral-950 p-5 text-white shadow-lg">
      {/* Carátulas de fondo, difuminadas */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-1 opacity-35 blur-[2px]" aria-hidden="true">
        {posters.concat(posters).slice(0, 6).map((p, i) => (
          <div key={i} className="relative">
            <Image src={img(p, "w185")!} alt="" fill sizes="140px" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/85 to-neutral-950" aria-hidden="true" />

      <div className="relative">
        <h2 className="text-lg font-extrabold">🔥 {L ? "Hot among your friends" : "Lo que más se ve entre tus amigos"}</h2>
        <p className="text-xs text-white/70">{L ? "Last 7 days" : "Últimos 7 días"}</p>
      </div>
      {top.length === 0 ? (
        <p className="relative mt-4 text-sm text-white/75">{L ? "Your friends haven't marked anything this week yet." : "Tus amigos aún no han marcado nada esta semana."}</p>
      ) : (
        <ol className="relative mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {top.map(({ r, people, ratings }, i) => {
            const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
            return (
              <li key={`${r.media_type}-${r.tmdb_id}`}>
                <Link href={`/titulo/${r.media_type}/${r.tmdb_id}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 transition hover:bg-white/10">
                  <span className="w-5 text-center text-lg font-black text-amber-300">{i + 1}</span>
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    {r.poster_path && <Image src={img(r.poster_path, "w92")!} alt="" fill sizes="40px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.title}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="flex -space-x-2">
                        {people.slice(0, 4).map((p) => (
                          <span key={p.user_id} className="rounded-full ring-2 ring-neutral-950">
                            <Avatar url={p.avatar_url} size={20} />
                          </span>
                        ))}
                      </span>
                      <span className="text-[11px] text-white/75">
                        {people.length} {L ? (people.length === 1 ? "friend" : "friends") : people.length === 1 ? "amigo" : "amigos"}
                      </span>
                    </span>
                  </span>
                  {avg !== null && (
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold">
                      <span className="text-amber-400">★</span> {avg.toLocaleString(lang, { maximumFractionDigits: 1 })}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
