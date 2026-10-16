import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { Chat, type ChatMessage, type ChatMode } from "@/components/Chat";

type Props = { params: Promise<{ username: string }> };

export default async function ChatPage({ params }: Props) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: other } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle();
  if (!other || !other.username) {
    return <p className="py-20 text-center text-neutral-500">{t("profile.notFound")}</p>;
  }
  if (other.id === user.id) redirect("/mensajes");

  const [{ data: blocked }, { data: mutual }, { data: threads }, { data: rows }] = await Promise.all([
    supabase.rpc("blocked_between", { a: user.id, b: other.id }),
    supabase.rpc("is_mutual", { a: user.id, b: other.id }),
    supabase.from("dm_threads").select("requester_id, status").or(`user_a.eq.${other.id},user_b.eq.${other.id}`),
    supabase
      .from("messages")
      .select("id, sender_id, recipient_id, kind, body, tmdb_id, media_type, title, poster_path, created_at")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const th = threads?.[0] ?? null;
  let mode: ChatMode = "free";
  if (blocked === true) mode = "blocked";
  else if (mutual === true) mode = "free";
  else if (!th) mode = "first_request";
  else if (th.status === "accepted") mode = "free";
  else if (th.status === "pending") mode = th.requester_id === user.id ? "sent_request" : "incoming_request";
  else if (th.status === "declined") mode = th.requester_id === user.id ? "declined" : "free";

  const initial: ChatMessage[] = (rows ?? []).reverse().map((r) => ({
    id: r.id as string,
    mine: r.sender_id === user.id,
    kind: r.kind as ChatMessage["kind"],
    body: r.body as string | null,
    tmdb_id: r.tmdb_id as number | null,
    media_type: r.media_type as ChatMessage["media_type"],
    title: r.title as string | null,
    poster_path: r.poster_path as string | null,
    created_at: r.created_at as string,
  }));

  return (
    <>
      <Chat
        me={user.id}
        other={{
          id: other.id,
          username: other.username,
          name: other.display_name ?? other.username,
          avatarUrl: other.avatar_url,
        }}
        initial={initial}
        mode={mode}
      />
      <p className="sr-only">
        <Link href="/mensajes">{t("msg.back")}</Link>
      </p>
    </>
  );
}
