import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { ActivityFeed } from "@/components/ActivityFeed";
import { FriendsTabs } from "@/components/FriendsTabs";
import { FriendsRanking } from "@/components/FriendsRanking";
import { FriendsTrending } from "@/components/FriendsTrending";
import type { ActivityRow } from "@/app/profile-actions";

export const metadata = { title: "Actividad", robots: { index: false } };

// Lo último que han visto y puntuado las personas que sigues
export default async function ActivityPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: me }] = await Promise.all([
    supabase.rpc("friends_activity", { p_limit: 100 }),
    supabase.from("profiles").select("username, share_activity").eq("id", user.id).maybeSingle(),
  ]);

  const rows = (data ?? []) as ActivityRow[];
  const posters = [...new Set(rows.map((r) => r.poster_path).filter((p): p is string => !!p))].slice(0, 12);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:h-[calc(100dvh-8.5rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("act.title")}</h1>
        <FriendsTabs current="feed" />
      </div>
      {me && me.share_activity === false && (
        <p className="rounded-xl bg-neutral-100 px-4 py-2.5 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          🙈 {t("act.youHidden")}{" "}
          <Link href="/ajustes" className="font-semibold text-brand-fg underline">
            {t("nav.settings")}
          </Link>
        </p>
      )}
      {/* Izquierda: ranking + lo más visto · Derecha: actividad con su propio scroll. En ordenador ocupa justo la pantalla */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-5">
          <FriendsRanking hidden={me?.share_activity === false} posters={posters} />
          <FriendsTrending rows={rows} />
        </div>
        <div className="min-h-0">
          <ActivityFeed initial={rows.slice(0, 30)} myUsername={me?.username ?? null} />
        </div>
      </div>
    </div>
  );
}
