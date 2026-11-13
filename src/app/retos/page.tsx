import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { getBasic, img } from "@/lib/tmdb";
import { CHALLENGES, type Challenge } from "@/lib/challenges";
import { FriendsTabs } from "@/components/FriendsTabs";
import { Avatar } from "@/components/Avatar";
import { ChallengeJoin } from "@/components/ChallengeJoin";
import { ScrollRow } from "@/components/ScrollRow";

export const metadata = { title: "Retos", robots: { index: false } };

type Member = { user_id: string; username: string; display_name: string | null; avatar_url: string | null; seen: number; is_me: boolean };
type Cover = { title: string; poster_path: string | null };

// Retos de grupo: sagas para completar con tus amigos. Filas que se deslizan de lado y,
// al abrir uno, su detalle debajo (progreso del grupo, quién se ha apuntado y carteles).
export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ reto?: string }> }) {
  const { lang } = await getT();
  const L = lang === "en" ? 1 : 0;
  const { reto } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: counts, error }, { data: mine }] = await Promise.all([
    supabase.rpc("challenge_counts"),
    supabase.from("user_titles").select("tmdb_id, media_type").eq("user_id", user.id).in("status", ["visto", "volver_a_ver"]).limit(5000),
  ]);
  const seen = new Set((mine ?? []).map((r) => `${r.media_type}-${r.tmdb_id}`));
  const byCode = new Map(((counts ?? []) as { code: string; members: number; me: boolean }[]).map((c) => [c.code, c]));
  const open = CHALLENGES.find((c) => c.code === reto) ?? null;

  // Carteles (TMDB, con caché)
  const coverList = await Promise.all(CHALLENGES.map((c) => Promise.all(c.items.map((it) => getBasic(it.media_type, it.tmdb_id, lang)))));
  const covers = new Map<string, Cover[]>(CHALLENGES.map((c, i) => [c.code, coverList[i]]));
  let members: Member[] = [];
  if (open) {
    const { data } = await supabase.rpc("challenge_progress", { p_code: open.code, p_ids: open.items.map((i) => i.tmdb_id), p_types: open.items.map((i) => i.media_type) });
    members = (data ?? []) as Member[];
  }
  const mineSeen = (c: Challenge) => c.items.filter((it) => seen.has(`${it.media_type}-${it.tmdb_id}`)).length;

  // Filas: en marcha (te has apuntado o hay amigos dentro) y el resto
  const active = CHALLENGES.filter((c) => byCode.get(c.code)?.me || (byCode.get(c.code)?.members ?? 0) > 0);
  const rest = CHALLENGES.filter((c) => !active.includes(c));

  const Card = ({ c }: { c: Challenge }) => {
    const n = mineSeen(c);
    const info = byCode.get(c.code);
    const isOpen = open?.code === c.code;
    const cv = covers.get(c.code) ?? [];
    return (
      <div className={`relative flex w-72 shrink-0 snap-start flex-col self-stretch overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg sm:w-80 ${c.gradient} ${isOpen ? "ring-4 ring-inset ring-amber-300" : ""}`}>
        {/* Carteles en abanico */}
        <div className="pointer-events-none absolute -right-3 top-4 flex opacity-50" aria-hidden="true">
          {cv.slice(0, 4).map((x, k) =>
            x.poster_path ? (
              <span key={k} className="relative -ml-7 h-24 w-16 overflow-hidden rounded-lg shadow-lg ring-1 ring-white/30" style={{ transform: `rotate(${(k - 1.5) * 9}deg)` }}>
                <Image src={img(x.poster_path, "w92")!} alt="" fill sizes="64px" className="object-cover" />
              </span>
            ) : null
          )}
        </div>
        <div className="relative max-w-[62%]">
          <p className="text-3xl" aria-hidden="true">
            {c.emoji}
          </p>
          <h3 className="mt-1 text-lg font-extrabold leading-tight">{c.title[L]}</h3>
          <p className="text-xs text-white/80">{c.blurb[L]}</p>
        </div>
        <div className="relative mt-auto pt-4">
          <div className="flex justify-between text-xs font-bold text-white/85">
            <span>
              {L ? "You" : "Tú"}: {n}/{c.items.length}
            </span>
            {info && info.members > 0 && <span>👥 {info.members}</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-amber-400" style={{ width: `${(n / c.items.length) * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ChallengeJoin code={c.code} joined={!!info?.me} />
            <Link href={isOpen ? "/retos" : `/retos?reto=${c.code}#detalle`} scroll={false} className="rounded-full px-3 py-2 text-xs font-bold text-white/90 ring-1 ring-white/40 hover:bg-white/15">
              {isOpen ? (L ? "Close" : "Cerrar") : L ? "Details" : "Ver detalles"}
            </Link>
            {n === c.items.length && <span className="rounded-full bg-amber-300 px-2 py-1 text-[11px] font-black text-amber-950">🏆</span>}
          </div>
        </div>
      </div>
    );
  };

  const row = (id: string, icon: string, title: string, list: Challenge[]) =>
    list.length ? (
      <section key={id}>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <span aria-hidden="true">{icon}</span>
          {title}
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{list.length}</span>
        </h2>
        <ScrollRow label={title}>
          {list.map((c) => (
            <Card key={c.code} c={c} />
          ))}
        </ScrollRow>
      </section>
    ) : null;

  const oc = open ? covers.get(open.code) ?? [] : [];
  const group = open && members.length ? members.reduce((a, m) => a + m.seen, 0) / (members.length * open.items.length) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">🎯 {L ? "Challenges" : "Retos"}</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            {L ? "Join a saga, get your friends in and fill the bar together." : "Apúntate a una saga, anima a tus amigos y llenad la barra entre todos."}
          </p>
        </div>
        <FriendsTabs current="challenges" />
      </div>
      {error && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {L ? "Challenges will be available in a moment." : "Los retos estarán disponibles en un momento."}
        </p>
      )}

      {row("activos", "🔥", L ? "In progress with friends" : "En marcha con tus amigos", active)}
      {row("todos", "🎬", L ? "More challenges" : active.length ? "Más retos" : "Todos los retos", rest)}

      {open && (
        <section id="detalle" className={`scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br text-white shadow-xl ${open.gradient}`}>
          <div className="space-y-5 bg-black/35 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">
                {open.emoji} {open.title[L]}
              </h2>
              <Link href="/retos" scroll={false} className="rounded-full px-4 py-2 text-sm font-bold ring-1 ring-white/40 hover:bg-white/15">
                {L ? "Close" : "Cerrar"} ×
              </Link>
            </div>
            {group !== null && (
              <div>
                <p className="text-sm font-bold">
                  {L ? "Group progress" : "Progreso del grupo"} · {Math.round(group * 100)}%
                </p>
                <div className="mt-1.5 h-4 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400" style={{ width: `${group * 100}%` }} />
                </div>
              </div>
            )}
            {members.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((mb) => (
                  <li key={mb.user_id}>
                    <Link href={`/u/${mb.username}`} className={`flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/10 ${mb.is_me ? "bg-white/15" : "bg-white/5"}`}>
                      <Avatar url={mb.avatar_url} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{mb.is_me ? (L ? "You" : "Tú") : mb.display_name ?? `@${mb.username}`}</span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/20">
                          <span className="block h-full rounded-full bg-amber-300" style={{ width: `${(mb.seen / open.items.length) * 100}%` }} />
                        </span>
                      </span>
                      <span className="text-sm font-black tabular-nums">
                        {mb.seen}/{open.items.length}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/80">{L ? "Nobody has joined yet. Be the first!" : "Aún no se ha apuntado nadie. ¡Sé el primero!"}</p>
            )}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
              {open.items.map((it, k) => {
                const ok = seen.has(`${it.media_type}-${it.tmdb_id}`);
                const cv = oc[k];
                return (
                  <Link key={it.tmdb_id} href={`/titulo/${it.media_type}/${it.tmdb_id}`} title={cv?.title} className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-white/10">
                    {cv?.poster_path && (
                      <Image src={img(cv.poster_path, "w185")!} alt={cv.title} fill sizes="120px" className={`object-cover transition ${ok ? "" : "opacity-50 grayscale group-hover:opacity-90 group-hover:grayscale-0"}`} />
                    )}
                    {ok && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-black shadow">✓</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <p className="text-center text-xs text-neutral-500">{L ? "Only friends who share their activity appear in challenges." : "En los retos solo aparecen los amigos que comparten su actividad."}</p>
    </div>
  );
}
