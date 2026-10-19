import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { STATUSES, type Status } from "@/lib/dict";
import type { ProfileStats } from "@/lib/profile";
import { backfillTitleMeta } from "@/lib/backfill";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { RequestsPanel, type Person } from "@/components/RequestsPanel";
import { ProfilePills } from "@/components/ProfilePills";
import { BellIcon, ListIcon, MessageIcon } from "@/components/NavIcons";
import { ShareProfile } from "@/components/ShareProfile";
import { BlockButton } from "@/components/BlockButton";
import { StatsPanel } from "@/components/StatsPanel";
import { TitleCard } from "@/components/TitleCard";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ estado?: string }>;
};

const clean = (raw: string) => decodeURIComponent(raw).toLowerCase();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `@${clean((await params).username)} · Claqueta` };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const username = clean((await params).username);
  const sp = await searchParams;
  const { t } = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, is_private")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <p className="py-20 text-center text-neutral-500">
        {t("profile.notFound")}{" "}
        <Link href="/" className="text-brand-fg underline">
          ←
        </Link>
      </p>
    );
  }

  const isOwner = user?.id === profile.id;

  // ¿Puedo ver su actividad? (público, yo mismo, o seguidor aceptado)
  const { data: canViewData } = await supabase.rpc("can_view_profile", { p_owner: profile.id });
  const canView = canViewData === true;

  const { data: countsData } = await supabase.rpc("follow_counts", { p_user: profile.id });
  const counts = (countsData ?? { followers: 0, following: 0 }) as {
    followers: number;
    following: number;
  };

  // Relación entre quien mira y este perfil
  let rel: "none" | "pending" | "accepted" = "none";
  if (user && !isOwner) {
    const { data } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    if (data) rel = data.status as "pending" | "accepted";
  }

  // Visitas: se cuentan las de otras personas; solo el dueño ve el número
  let unread = 0;
  let unreadMsgs = 0;
  let iBlocked = false;
  let visits: number | null = null;
  let requests: Person[] = [];
  if (user && !isOwner) {
    const { data: b } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", profile.id)
      .maybeSingle();
    iBlocked = !!b;
  }
  if (isOwner) {
    await backfillTitleMeta(supabase, profile.id);

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("read_at", null);
    unread = unreadCount ?? 0;
    const { count: msgCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .in("type", ["message", "recommendation"])
      .is("read_at", null);
    unreadMsgs = msgCount ?? 0;

    const { data: v } = await supabase
      .from("profile_visits")
      .select("visits")
      .eq("user_id", profile.id)
      .maybeSingle();
    visits = Number(v?.visits ?? 0);

    const { data: reqs } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const ids = (reqs ?? []).map((r) => r.follower_id as string);
    if (ids.length > 0) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      requests = (people ?? []).filter((p) => p.username) as Person[];
    }
  } else {
    try {
      await supabase.rpc("register_visit", { p_user: profile.id });
    } catch {
      // las visitas son un extra: si falla no se interrumpe la página
    }
  }

  let stats: ProfileStats | null = null;
  let titles: {
    tmdb_id: number;
    media_type: string;
    title: string;
    poster_path: string | null;
    status: string | null;
    rating: number | string | null;
  }[] = [];
  if (canView) {
    const [s, tt] = await Promise.all([
      supabase.rpc("profile_stats", { p_user: profile.id }),
      supabase.rpc("profile_titles", { p_user: profile.id }),
    ]);
    stats = (s.data ?? null) as ProfileStats | null;
    titles = (tt.data ?? []) as typeof titles;
  }

  const estado = STATUSES.includes(sp.estado as Status) ? (sp.estado as Status) : null;
  const shown = estado ? titles.filter((r) => r.status === estado) : titles;

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-brand bg-brand text-white"
        : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;
  const base = `/u/${profile.username}`;
  const name = profile.display_name || profile.username!;

  return (
    <div className="space-y-8">
      <Reveal>
        <header className="flex flex-col items-center gap-5 rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:items-start sm:text-left dark:border-neutral-800 dark:bg-neutral-900">
          <Avatar url={profile.avatar_url} size={112} className="shadow-md" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start">
                {name}
                {profile.is_private && (
                  <span
                    title={t("profile.private")}
                    className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold dark:bg-neutral-800"
                  >
                    🔒 {t("profile.private")}
                  </span>
                )}
              </h1>
              <p className="text-neutral-500">@{profile.username}</p>
            </div>

            {profile.bio && <p className="max-w-xl text-sm">{profile.bio}</p>}

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm sm:justify-start">
              {canView ? (
                <>
                  <Link href={`${base}/seguidores?tipo=seguidores`} className="hover:underline">
                    <strong className="text-base">
                      <CountUp value={counts.followers} />
                    </strong>{" "}
                    {t("profile.followers")}
                  </Link>
                  <Link href={`${base}/seguidores?tipo=seguidos`} className="hover:underline">
                    <strong className="text-base">
                      <CountUp value={counts.following} />
                    </strong>{" "}
                    {t("profile.following")}
                  </Link>
                </>
              ) : (
                <>
                  <span>
                    <strong className="text-base">{counts.followers}</strong> {t("profile.followers")}
                  </span>
                  <span>
                    <strong className="text-base">{counts.following}</strong> {t("profile.following")}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {isOwner ? (
                <>
                <Link
                  href="/ajustes"
                  className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  {t("profile.edit")}
                </Link>
                <ShareProfile username={profile.username!} />
                </>
              ) : (
                <>
                  {!iBlocked && <FollowButton targetId={profile.id} initial={rel} loggedIn={!!user} />}
                  {user && !iBlocked && (
                    <Link
                      href={`/mensajes/${profile.username}`}
                      className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-hover dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      {t("msg.start")}
                    </Link>
                  )}
                  {user && <BlockButton targetId={profile.id} initialBlocked={iBlocked} />}
                </>
              )}
              {visits !== null && (
                <span
                  className="text-xs text-neutral-500"
                  title={t("profile.visitsHint")}
                >
                  👁 <strong>{visits}</strong> {t("profile.visits")} · {t("profile.visitsHint")}
                </span>
              )}
            </div>
          </div>
          {isOwner ? (
            <ProfilePills
              items={[
                { href: "/notificaciones", label: t("notif.title"), Icon: BellIcon, badge: unread - unreadMsgs },
                { href: "/mensajes", label: t("msg.title"), Icon: MessageIcon, badge: unreadMsgs },
                { href: `${base}/listas`, label: t("lists.mine"), Icon: ListIcon },
              ]}
            />
          ) : (
            canView && (
              <ProfilePills items={[{ href: `${base}/listas`, label: t("lists.title"), Icon: ListIcon }]} />
            )
          )}
        </header>
      </Reveal>

      {isOwner && requests.length > 0 && <RequestsPanel requests={requests} />}

      {!canView ? (
        <Reveal>
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="text-3xl" aria-hidden="true">
              🔒
            </p>
            <p className="mt-2 font-semibold">{t("profile.private")}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {user ? t("profile.privateMsg") : t("profile.privateLogin")}
            </p>
          </div>
        </Reveal>
      ) : (
        <>
          {stats && (
            <Reveal>
              <StatsPanel stats={stats} />
            </Reveal>
          )}

          <Reveal>
            <section className="space-y-4">
              <h2 className="text-lg font-bold">{t("profile.activity")}</h2>
              <nav className="flex flex-wrap gap-2" aria-label={t("profile.activity")}>
                <Link href={base} className={chip(!estado)} scroll={false}>
                  {t("list.all")}
                </Link>
                {STATUSES.map((s) => (
                  <Link key={s} href={`${base}?estado=${s}`} className={chip(estado === s)} scroll={false}>
                    {t(`status.${s}` as const)}
                  </Link>
                ))}
              </nav>

              {shown.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">{t("profile.noActivity")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {shown.map((r, i) => (
                    <TitleCard
                      key={`${r.media_type}-${r.tmdb_id}`}
                      id={r.tmdb_id}
                      type={r.media_type as "movie" | "tv"}
                      title={r.title}
                      posterPath={r.poster_path}
                      status={r.status as Status | null}
                      rating={r.rating === null ? null : Number(r.rating)}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}
