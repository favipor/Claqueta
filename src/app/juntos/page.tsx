import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { FriendsTabs } from "@/components/FriendsTabs";
import { Avatar } from "@/components/Avatar";
import { WatchTogether, type TogetherItem } from "@/components/WatchTogether";

export const metadata = { title: "¿Qué vemos juntos?", robots: { index: false } };

type Friend = { id: string; username: string; display_name: string | null; avatar_url: string | null };

// «¿Qué vemos juntos?»: eliges a un amigo (os seguís mutuamente) y se cruzan vuestros pendientes
export default async function TogetherPage({ searchParams }: { searchParams: Promise<{ con?: string }> }) {
  const { t } = await getT();
  const { con } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("mutual_followers");
  const friends = ((data ?? []) as Friend[]).filter((f) => f.username).sort((a, b) => (a.display_name ?? a.username).localeCompare(b.display_name ?? b.username));
  const friend = friends.find((f) => f.username === con) ?? null;
  let items: TogetherItem[] = [];
  if (friend) {
    const { data: rows } = await supabase.rpc("watch_together", { p_friend: friend.id });
    items = (rows ?? []) as TogetherItem[];
  }

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
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-4xl" aria-hidden="true">
            👯
          </p>
          <p className="mt-2 font-semibold">{t("together.noFriends")}</p>
          <Link href="/descubrir" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
            {t("act.findPeople")}
          </Link>
        </div>
      ) : (
        <>
          <section aria-label={t("together.pick")}>
            <p className="mb-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">{t("together.pick")}</p>
            <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
              {friends.map((f) => {
                const on = f.username === friend?.username;
                return (
                  <li key={f.id} className="shrink-0">
                    <Link
                      href={`/juntos?con=${f.username}`}
                      scroll={false}
                      aria-current={on ? "true" : undefined}
                      className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold ring-1 transition ${
                        on
                          ? "bg-brand text-white ring-brand"
                          : "bg-white ring-neutral-200 hover:ring-brand-fg dark:bg-neutral-900 dark:ring-neutral-700"
                      }`}
                    >
                      <Avatar url={f.avatar_url} size={30} />
                      {f.display_name ?? `@${f.username}`}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          {friend ? (
            <WatchTogether key={friend.id} items={items} friendName={friend.display_name ?? `@${friend.username}`} friendAvatar={friend.avatar_url} />
          ) : (
            <p className="rounded-2xl bg-neutral-100 p-8 text-center text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">👆 {t("together.choose")}</p>
          )}
        </>
      )}
    </div>
  );
}
