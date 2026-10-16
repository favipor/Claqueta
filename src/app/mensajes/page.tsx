import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { InboxList, type InboxRow } from "@/components/InboxList";

export const metadata = { title: "Claqueta" };

export default async function InboxPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("dm_inbox");
  const rows: InboxRow[] = ((data ?? []) as any[]).map((r) => ({
    username: r.other_username,
    name: r.other_name ?? r.other_username,
    avatarUrl: r.other_avatar,
    incomingRequest: r.incoming_request,
    kind: r.last_kind,
    body: r.last_body,
    title: r.last_title,
    at: r.last_at,
    fromMe: r.last_from_me,
    unread: r.has_unread,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold">{t("msg.title")}</h1>
      <InboxList rows={rows} />
    </div>
  );
}
