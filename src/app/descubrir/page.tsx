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

// Degradado de la banda cuando no hay carátulas en común (cada persona tiene siempre el mismo)
const BANDS = ["from-teal-500 to-cyan-700", "from-violet-500 to-indigo-700", "from-rose-500 to-orange-600", "from-amber-400 to-rose-600", "from-emerald-500 to-teal-800", "from-sky-500 to-indigo-700", "from-fuchsia-500 to-purple-800"];

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

  // Tarjeta de cada persona: banda con vuestras carátulas en común (o un degradado), avatar encima,
  // afinidad en la banda y los títulos en común en fila, sin que el texto pise nada
  const PersonCard = ({ p }: { p: Person }) => {
    const shared = (p.shared ?? []).filter((s) => s.poster_path).slice(0, 4);
    const extra = Math.max(0, p.shared_count - shared.length);
    const hue = BANDS[[...p.username].reduce((a, c) => a + c.charCodeAt(0), 0) % BANDS.length];
    const aff = p.affinity ?? 0;
    return (
      <div className="group flex h-full w-72 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900">
        <div className={`relative h-24 shrink-0 overflow-hidden bg-gradient-to-br ${hue}`}>
          {shared.length > 0 && (
            <div className="absolute inset-0 flex scale-110 blur-[3px]" aria-hidden="true">
              {shared.concat(shared).slice(0, 4).map((s, i) => (
                <div key={i} className="relative h-full flex-1">
                  <Image src={img(s.poster_path, "w185")!} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/55" aria-hidden="true" />
          {aff > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md" title={t("disc.affinityHint")}>
              <span className={aff >= 50 ? "text-rose-300" : "text-teal-200"}>{aff >= 50 ? "♥" : "★"}</span> {aff}% {t("disc.affinity")}
              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-400" style={{ width: `${Math.min(aff, 100)}%` }} />
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4">
          <div className="relative z-10 -mt-8 flex items-end gap-3">
            <Link href={`/u/${p.username}`} className="shrink-0 rounded-full ring-4 ring-white transition group-hover:scale-105 dark:ring-neutral-900">
              <Avatar url={p.avatar_url} size={64} />
            </Link>
          </div>
          <div className="mt-2 min-w-0">
            <Link href={`/u/${p.username}`} className="block truncate text-base font-extrabold hover:underline">
              {p.display_name ?? p.username}
            </Link>
            <p className="truncate text-sm text-neutral-500">@{p.username}</p>
          </div>

          {p.bio && <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{p.bio}</p>}

          <div className="mt-3">
            {p.is_private ? (
              <p className="rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">🔒 {t("disc.private")}</p>
            ) : p.shared_count > 0 ? (
              <>
                <p className="text-xs leading-snug text-neutral-600 dark:text-neutral-300">
                  {p.shared?.[0] ? (
                    <>
                      🍿 {t("disc.bothHave")} <b className="text-neutral-900 dark:text-white">{p.shared[0].title}</b>
                      {p.shared_count > 1 ? ` ${t("disc.andMore").replace("{n}", String(p.shared_count - 1))}` : ""}
                    </>
                  ) : (
                    `${p.shared_count} ${t("disc.shared")}`
                  )}
                </p>
                <div className="mt-2 flex gap-1.5">
                  {shared.map((s) => (
                    <Link
                      key={`${s.media_type}-${s.tmdb_id}`}
                      href={`/titulo/${s.media_type}/${s.tmdb_id}`}
                      title={s.title}
                      className="relative h-[4.2rem] w-11 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 dark:ring-white/10"
                    >
                      <Image src={img(s.poster_path, "w92")!} alt={s.title} fill sizes="44px" className="object-cover" />
                    </Link>
                  ))}
                  {extra > 0 && (
                    <span className="grid h-[4.2rem] w-11 shrink-0 place-items-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">+{extra}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700">{t("disc.noCommon")}</p>
            )}
          </div>

          <div className="mt-auto pt-4">
            <FollowButton targetId={p.id} initial={p.rel} loggedIn />
          </div>
        </div>
      </div>
    );
  };

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
