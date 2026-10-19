import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { img } from "@/lib/tmdb";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { ShareProfile } from "@/components/ShareProfile";

export const metadata = { title: "Claqueta" };

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

  return (
    <div className="space-y-8">
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
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
                  <p className="text-xs text-neutral-500">
                    {p.shared_count} {t("disc.shared")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">{t("disc.noCommon")}</p>
              )}

              <div className="mt-auto pt-1">
                <FollowButton targetId={p.id} initial={p.rel} loggedIn />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
