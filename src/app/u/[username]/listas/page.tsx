import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { img } from "@/lib/tmdb";
import type { DictKey } from "@/lib/dict";
import { ListForm } from "@/components/ListForm";
import { ListIcon } from "@/components/NavIcons";

type Props = { params: Promise<{ username: string }> };

type Overview = {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  item_count: number | string;
  posters: string[];
};

export default async function ListsPage({ params }: Props) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) {
    return <p className="py-20 text-center text-neutral-500">{t("profile.notFound")}</p>;
  }

  const isOwner = user?.id === profile.id;
  const { data: canView } = await supabase.rpc("can_view_profile", { p_owner: profile.id });
  const { data } = canView === true
    ? await supabase.rpc("lists_overview", { p_user: profile.id })
    : { data: [] };
  const lists = (data ?? []) as Overview[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/u/${profile.username}`} className="text-sm text-brand-fg hover:underline">
          ← @{profile.username}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <ListIcon className="h-6 w-6" />
          {isOwner ? t("lists.mine") : `${t("lists.of")} ${profile.display_name ?? profile.username}`}
        </h1>
      </div>

      {isOwner && (
        <details className="group">
          <summary className="inline-block cursor-pointer rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + {t("lists.new")}
          </summary>
          <div className="mt-3 max-w-xl">
            <ListForm />
          </div>
        </details>
      )}

      {lists.length === 0 ? (
        <p className="py-12 text-center text-neutral-500">{t("lists.none")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listas/${l.id}`}
                className="block overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-hover dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="grid h-36 grid-cols-4 bg-neutral-200 dark:bg-neutral-800">
                  {[0, 1, 2, 3].map((i) => {
                    const src = img(l.posters?.[i], "w185");
                    return src ? (
                      <Image key={i} src={src} alt="" width={92} height={138} className="h-36 w-full object-cover" />
                    ) : (
                      <div key={i} />
                    );
                  })}
                </div>
                <div className="space-y-1 p-4">
                  <h2 className="truncate font-bold">{l.name}</h2>
                  {l.description && <p className="line-clamp-2 text-sm text-neutral-500">{l.description}</p>}
                  <p className="text-xs text-neutral-500">
                    {Number(l.item_count)} {t("lists.items")} · {t(`cm.vis.${l.visibility}` as DictKey)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
