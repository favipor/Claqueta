import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { ActivityFeed } from "@/components/ActivityFeed";
import { FriendsTabs } from "@/components/FriendsTabs";
import { FriendsRanking } from "@/components/FriendsRanking";
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
    supabase.rpc("friends_activity", { p_limit: 30 }),
    supabase.from("profiles").select("username, share_activity").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
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
      <FriendsRanking hidden={me?.share_activity === false} />
      <ActivityFeed initial={(data ?? []) as ActivityRow[]} myUsername={me?.username ?? null} />
    </div>
  );
}
