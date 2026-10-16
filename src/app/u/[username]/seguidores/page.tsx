import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";
import type { Person } from "@/components/RequestsPanel";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export default async function ConnectionsPage({ params, searchParams }: Props) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const kind = (await searchParams).tipo === "seguidos" ? "following" : "followers";
  const { t } = await getT();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return <p className="py-20 text-center text-neutral-500">{t("profile.notFound")}</p>;
  }

  const { data: canView } = await supabase.rpc("can_view_profile", { p_owner: profile.id });
  const { data } = canView
    ? await supabase.rpc("profile_connections", { p_user: profile.id, p_kind: kind })
    : { data: [] };
  const people = (data ?? []) as Person[];

  const base = `/u/${profile.username}`;
  const tab = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-brand bg-brand text-white"
        : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <p>
        <Link href={base} className="text-sm text-brand-fg hover:underline">
          ← {profile.display_name || profile.username} (@{profile.username})
        </Link>
      </p>

      <nav className="flex gap-2">
        <Link href={`${base}/seguidores?tipo=seguidores`} className={tab(kind === "followers")}>
          {t("profile.followersTitle")}
        </Link>
        <Link href={`${base}/seguidores?tipo=seguidos`} className={tab(kind === "following")}>
          {t("profile.followingTitle")}
        </Link>
      </nav>

      {!canView ? (
        <p className="py-8 text-center text-neutral-500">🔒 {t("profile.privateMsg")}</p>
      ) : people.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">{t("profile.noPeople")}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/u/${p.username}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <Avatar url={p.avatar_url} size={44} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {p.display_name ?? p.username}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">@{p.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
