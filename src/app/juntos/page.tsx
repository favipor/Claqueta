import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { FriendsTabs } from "@/components/FriendsTabs";
import { FriendPicker } from "@/components/FriendPicker";
import { Avatar } from "@/components/Avatar";
import { WatchTogether, type TogetherItem } from "@/components/WatchTogether";
import { TogetherHero, type Compat } from "@/components/TogetherHero";
import { PlansPanel, type Plan } from "@/components/PlansPanel";

export const metadata = { title: "¿Qué vemos juntos?", robots: { index: false } };

type Friend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

// Colores distintos para cada amigo en las tarjetas de elegir
const TONES = [
  "from-rose-400 to-fuchsia-600",
  "from-sky-400 to-indigo-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-700",
  "from-violet-400 to-purple-700",
  "from-lime-400 to-green-700",
];

// «¿Qué vemos juntos?»: eliges a un amigo (os seguís mutuamente) y se cruzan vuestros pendientes
export default async function TogetherPage({ searchParams }: { searchParams: Promise<{ con?: string }> }) {
  const { t, lang } = await getT();
  const L = lang === "en";
  const { con } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: me }] = await Promise.all([
    supabase.rpc("mutual_followers"),
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  // Sin repetidos (la lista de seguidores mutuos puede traer a alguien dos veces)
  const friends = [...new Map(((data ?? []) as Friend[]).filter((f) => f.username).map((f) => [f.id, f])).values()].sort((a, b) => (a.display_name ?? a.username).localeCompare(b.display_name ?? b.username));
  const friend = friends.find((f) => f.username === con) ?? null;
  let items: TogetherItem[] = [];
  let compat: Compat | null = null;
  let plans: Plan[] = [];
  if (friend) {
    const today = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const [rows, c, pl] = await Promise.all([
      supabase.rpc("watch_together", { p_friend: friend.id }),
      supabase.rpc("friend_compat", { p_friend: friend.id }),
      supabase
        .from("watch_plans")
        .select("id, creator_id, invitee_id, tmdb_id, media_type, title, poster_path, plan_date, status")
        .or(`and(creator_id.eq.${user.id},invitee_id.eq.${friend.id}),and(creator_id.eq.${friend.id},invitee_id.eq.${user.id})`)
        .in("status", ["pending", "accepted"])
        .gte("plan_date", today)
        .order("plan_date"),
    ]);
    items = (rows.data ?? []) as TogetherItem[];
    compat = (c.error ? null : c.data) as Compat | null; // si falta phase12.sql, la cabecera sale sin datos
    plans = (pl.error ? [] : pl.data ?? []) as Plan[];
  }
  const friendName = friend ? friend.display_name ?? `@${friend.username}` : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">🍿 {t("together.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("together.subtitle")}</p>
        </div>
        <FriendsTabs current="together" />
      </div>

      {friends.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-rose-500 via-fuchsia-700 to-indigo-950 p-10 text-center text-white">
          <p className="text-5xl" aria-hidden="true">
            👯
          </p>
          <p className="mt-3 text-lg font-bold">{t("together.noFriends")}</p>
          <Link href="/descubrir" className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-fuchsia-800 hover:bg-fuchsia-50">
            {t("act.findPeople")}
          </Link>
        </div>
      ) : (
        <>
          <section aria-label={t("together.pick")} className="space-y-2">
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{t("together.pick")}</p>
            <FriendPicker friends={friends} current={friend?.username ?? null} />
          </section>

          {friend ? (
            <>
              <TogetherHero me={{ avatar_url: me?.avatar_url ?? null }} friend={friend} compat={compat} />
              <PlansPanel key={friend.id} plans={plans} meId={user.id} friendName={friendName} />
              <WatchTogether key={friend.id} items={items} friendName={friendName} friendAvatar={friend.avatar_url} friendId={friend.id} />
            </>
          ) : (
            // Sin amigo elegido: tarjetas grandes y de colores para escoger con quién
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {friends.slice(0, 8).map((f, i) => (
                <li key={f.id}>
                  <Link
                    href={`/juntos?con=${f.username}`}
                    scroll={false}
                    className={`group relative flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-center text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${TONES[i % TONES.length]}`}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-20 transition group-hover:rotate-12" aria-hidden="true">
                      🍿
                    </span>
                    <span className="rounded-full ring-4 ring-white/70">
                      <Avatar url={f.avatar_url} size={64} />
                    </span>
                    <span className="mt-3 w-full truncate font-extrabold">{f.display_name ?? `@${f.username}`}</span>
                    <span className="mt-1 text-xs font-semibold text-white/85">{L ? "See what you share →" : "Ver qué tenéis en común →"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
