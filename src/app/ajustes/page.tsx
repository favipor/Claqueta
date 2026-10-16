import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { privacyCooldownUntil } from "@/lib/profile";
import { BlockedList } from "@/components/BlockedList";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Claqueta" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, is_private, privacy_changed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!p?.username) redirect("/bienvenida");

  const until = privacyCooldownUntil(p.privacy_changed_at);

  const { data: blocks } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id);
  const ids = (blocks ?? []).map((b) => b.blocked_id as string);
  const { data: blockedPeople } = ids.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)
    : { data: [] };

  return (
    <>
    <SettingsForm
      userId={user.id}
      username={p.username}
      initial={{
        display_name: p.display_name ?? "",
        bio: p.bio ?? "",
        avatar_url: p.avatar_url,
        is_private: p.is_private,
      }}
      cooldownUntil={until ? until.toISOString() : null}
    />
    <BlockedList people={(blockedPeople ?? []) as any} />
    </>
  );
}
