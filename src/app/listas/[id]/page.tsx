import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import type { Visibility } from "@/lib/comments";
import type { DictKey } from "@/lib/dict";
import { TitleCard } from "@/components/TitleCard";
import { ListEditor, type ListEntry } from "@/components/ListEditor";

type Props = { params: Promise<{ id: string }> };

export default async function ListPage({ params }: Props) {
  const { id } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notFound = (
    <p className="py-20 text-center text-neutral-500">
      {t("lists.notFound")}{" "}
      <Link href="/" className="text-brand-fg underline">
        ←
      </Link>
    </p>
  );
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound;

  // La seguridad de la base de datos solo devuelve la lista si tienes permiso para verla
  const { data: list } = await supabase
    .from("lists")
    .select("id, user_id, name, description, visibility")
    .eq("id", id)
    .maybeSingle();
  if (!list) return notFound;

  const [{ data: owner }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", list.user_id).maybeSingle(),
    supabase
      .from("list_items")
      .select("tmdb_id, media_type, title, poster_path")
      .eq("list_id", id)
      .order("position", { ascending: true })
      .order("added_at", { ascending: true }),
  ]);
  const items = (rows ?? []) as ListEntry[];
  const isOwner = user?.id === list.user_id;
  const ownerName = owner?.display_name ?? owner?.username ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={`/u/${owner?.username}/listas`} className="text-sm text-brand-fg hover:underline">
          ← {t("lists.back")}
        </Link>
        <h1 className="text-3xl font-extrabold">{list.name}</h1>
        {list.description && <p className="max-w-2xl text-neutral-600 dark:text-neutral-300">{list.description}</p>}
        <p className="text-sm text-neutral-500">
          {t("lists.by")}{" "}
          <Link href={`/u/${owner?.username}`} className="font-semibold hover:underline">
            {ownerName}
          </Link>{" "}
          · {items.length} {t("lists.items")} · {t(`cm.vis.${list.visibility}` as DictKey)}
        </p>
      </div>

      {isOwner ? (
        <ListEditor
          listId={list.id}
          username={owner?.username ?? ""}
          initial={{
            name: list.name,
            description: list.description ?? "",
            visibility: list.visibility as Visibility,
          }}
          items={items}
        />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">{t("lists.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it, i) => (
            <TitleCard
              key={`${it.media_type}-${it.tmdb_id}`}
              id={it.tmdb_id}
              type={it.media_type}
              title={it.title}
              posterPath={it.poster_path}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
