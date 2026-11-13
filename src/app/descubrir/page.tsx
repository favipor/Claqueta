import { FriendsTabs } from "@/components/FriendsTabs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { img } from "@/lib/tmdb";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { ShareProfile } from "@/components/ShareProfile";
import { ScrollRow } from "@/components/ScrollRow";

export const metadata = { title: "Descubrir" };

type Person = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  rel: "none" | "pending" | "accepted";
  affinity: number | null;
  shared_count: number;
  shared: { tmdb_id: number; media_type: string; title: string; poster_path: string | null }[] | null;
};

export default async function DiscoverPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: me }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.rpc("discover_people", { p_limit: 48 }),
  ]);
  const people = (data ?? []) as Person[];
  // Filas: muy afines, con títulos en común y el resto
  const taken = new Set<string>();
  const pick = (f: (p: Person) => boolean) => people.filter((p) => !taken.has(p.id) && f(p) && !!taken.add(p.id));
  const groups = [
    { id: "afines", icon: "💘", title: t("disc.rowAffinity"), people: pick((p) => (p.affinity ?? 0) >= 50) },
    { id: "comun", icon: "🍿", title: t("disc.rowShared"), people: pick((p) => p.shared_count > 0) },
    { id: "resto", icon: "✨", title: t("disc.rowMore"), people: pick(() => true) },
  ];

  // Tarjeta de cada persona
  const PersonCard = ({ p }: { p: Person }) => (
    <div
              className="flex h-full w-72 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center gap-3">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  <Avatar url={p.avatar_url} size={56} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${p.username}`} className="block truncate font-bold hover:underline">
                    {p.display_name ?? p.username}
                  </Link>
                  <p className="truncate text-sm text-neutral-500">@{p.username}</p>
                </div>
                {p.affinity !== null && p.affinity > 0 && (
                  <span
                    className="shrink-0 rounded-full bg-brand px-3 py-1 text-sm font-bold text-white"
                    title={t("disc.affinityHint")}
                  >
                    {p.affinity}% {t("disc.affinity")}
                  </span>
                )}
              </div>

              {p.bio && <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{p.bio}</p>}

              {p.is_private ? (
                <p className="text-xs text-neutral-500">🔒 {t("disc.private")}</p>
              ) : p.shared_count > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {(p.shared ?? []).map((s) => {
                      const src = img(s.poster_path, "w92");
                      return src ? (
                        <Image
                          key={`${s.media_type}-${s.tmdb_id}`}
                          src={src}
                          alt={s.title}
                          title={s.title}
                          width={32}
                          height={48}
                          className="h-12 w-8 rounded border-2 border-white object-cover dark:border-neutral-900"
                        />
                      ) : null;
                    })}
                  </div>
                  <p className="min-w-0 text-xs leading-snug text-neutral-600 dark:text-neutral-300">
                    {/* Frase con el título que más le gustó de los que tenéis en común */}
                    {p.shared?.[0] ? (
                      <>
                        🎬 {t("disc.bothHave")} <b className="text-neutral-900 dark:text-white">{p.shared[0].title}</b>
                        {p.shared_count > 1 ? ` ${t("disc.andMore").replace("{n}", String(p.shared_count - 1))}` : ""}
                      </>
                    ) : (
                      `${p.shared_count} ${t("disc.shared")}`
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">{t("disc.noCommon")}</p>
              )}

              <div className="mt-auto pt-1">
                <FollowButton targetId={p.id} initial={p.rel} loggedIn />
              </div>
            </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <FriendsTabs current="people" />
      </div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold">{t("disc.title")}</h1>
          <p className="max-w-xl text-sm text-neutral-500">{t("disc.subtitle")}</p>
        </div>
        {me?.username && <ShareProfile username={me.username} />}
      </header>

      {error ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
          {t("disc.error")}
        </p>
      ) : people.length === 0 ? (
        <p className="py-14 text-center text-neutral-500">{t("disc.empty")}</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) =>
            g.people.length ? (
              <section key={g.id}>
                <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
                  <span aria-hidden="true">{g.icon}</span>
                  {g.title}
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{g.people.length}</span>
                </h2>
                <ScrollRow label={g.title}>
                  {g.people.map((p) => (
                    <PersonCard key={p.id} p={p} />
                  ))}
                </ScrollRow>
              </section>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
