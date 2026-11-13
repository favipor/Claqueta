import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { FriendsTabs } from "@/components/FriendsTabs";
import { FriendPicker } from "@/components/FriendPicker";
import { Avatar } from "@/components/Avatar";
import { BannerBg } from "@/components/BannerBg";
import { WatchTogether, type TogetherItem } from "@/components/WatchTogether";
import { TogetherHero, type Compat } from "@/components/TogetherHero";
import { PlansPanel, type Plan } from "@/components/PlansPanel";

export const metadata = { title: "¿Qué vemos juntos?", robots: { index: false } };

type Friend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

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
  // Banner que cada amigo eligió para su tarjeta (solo hace falta para elegir con quién)
  const banners = new Map<string, string | null>();
  if (!friend && friends.length) {
    const { data: rows } = await supabase.from("profiles").select("id, banner").in("id", friends.slice(0, 8).map((f) => f.id));
    for (const r of rows ?? []) banners.set(r.id as string, r.banner as string | null);
  }
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
              <PlansPanel key={`plans-${friend.id}`} plans={plans} meId={user.id} friendName={friendName} />
              <WatchTogether key={`wt-${friend.id}`} items={items} friendName={friendName} friendAvatar={friend.avatar_url} friendId={friend.id} />
            </>
          ) : (
            // Sin amigo elegido: su tarjeta de perfil (con el banner que eligió) para escoger con quién
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {friends.slice(0, 8).map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/juntos?con=${f.username}`}
                    scroll={false}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <span className="relative block h-20 overflow-hidden sm:h-24">
                      <BannerBg banner={banners.get(f.id)} username={f.username} />
                      <span className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" aria-hidden="true" />
                    </span>
                    <span className="flex flex-1 flex-col items-center px-3 pb-4 text-center">
                      <span className="relative z-10 -mt-9 rounded-full ring-4 ring-white transition group-hover:scale-105 dark:ring-neutral-900">
                        <Avatar url={f.avatar_url} size={64} />
                      </span>
                      <span className="mt-2 w-full truncate font-extrabold">{f.display_name ?? f.username}</span>
                      <span className="w-full truncate text-xs text-neutral-500">@{f.username}</span>
                      <span className="mt-3 whitespace-nowrap rounded-full bg-brand-fg/10 px-3 py-1.5 text-xs font-bold text-brand-fg ring-1 ring-inset ring-brand-fg/30 transition group-hover:bg-brand group-hover:text-white group-hover:ring-brand">
                        🍿 <span className="sm:hidden">{L ? "In common" : "En común"}</span>
                        <span className="hidden sm:inline">{L ? "See what you share" : "Ver qué tenéis en común"}</span>
                      </span>
                    </span>
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
