import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { getDetail, type MediaType } from "@/lib/tmdb";
import { NotificationsList, type NotifItem } from "@/components/NotificationsList";

export const metadata = { title: "Claqueta" };

export default async function NotificationsPage() {
  const { lang, t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, actor_id, tmdb_id, media_type, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  const list = rows ?? [];

  const actorIds = [...new Set(list.map((n) => n.actor_id).filter(Boolean))] as string[];
  const [{ data: people }, { data: pending }] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", actorIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("follows").select("follower_id").eq("following_id", user.id).eq("status", "pending"),
  ]);
  const byId = new Map((people ?? []).map((p: any) => [p.id as string, p]));
  const pendingSet = new Set((pending ?? []).map((p) => p.follower_id as string));

  // Nombres de los títulos citados (máx. 20 consultas distintas)
  const keys = [
    ...new Set(
      list
        .filter((n) => n.tmdb_id && n.media_type)
        .map((n) => `${n.media_type}:${n.tmdb_id}`)
    ),
  ].slice(0, 20);
  const names = new Map<string, string>();
  await Promise.all(
    keys.map(async (k) => {
      const [type, id] = k.split(":");
      const d = await getDetail(type as MediaType, Number(id), lang).catch(() => null);
      if (d) names.set(k, d.title);
    })
  );

  const items: NotifItem[] = list.map((n) => {
    const a: any = n.actor_id ? byId.get(n.actor_id as string) : null;
    const key = `${n.media_type}:${n.tmdb_id}`;
    return {
      id: n.id as string,
      type: n.type as NotifItem["type"],
      unread: !n.read_at,
      createdAt: n.created_at as string,
      actor: a
        ? { id: a.id, username: a.username, name: a.display_name ?? a.username, avatarUrl: a.avatar_url }
        : null,
      titleName: names.get(key) ?? null,
      // Al pulsar el aviso: perfil (seguidores), chat (mensajes) o la conversación del título (respuestas y menciones)
      href:
        n.type === "message" || n.type === "recommendation"
          ? a?.username
            ? `/mensajes/${a.username}`
            : null
          : n.type === "reply" || n.type === "mention"
            ? n.tmdb_id && n.media_type
              ? `/titulo/${n.media_type}/${n.tmdb_id}#conversacion`
              : null
            : a?.username
              ? `/u/${a.username}`
              : null,
      titleHref: n.tmdb_id && n.media_type ? `/titulo/${n.media_type}/${n.tmdb_id}` : null,
      requestOpen: n.type === "follow_request" && !!n.actor_id && pendingSet.has(n.actor_id as string),
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">{t("notif.title")}</h1>
      <NotificationsList items={items} />
    </div>
  );
}
