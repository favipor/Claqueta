import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { privacyCooldownUntil } from "@/lib/profile";
import { BlockedList } from "@/components/BlockedList";
import { SettingsForm } from "@/components/SettingsForm";
import { ProvidersPicker } from "@/components/ProvidersPicker";
import { PushToggle } from "@/components/PushToggle";
import { getProviders } from "@/lib/tmdb";
import { getT } from "@/lib/i18n-server";

export const metadata = { title: "Ajustes" };

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

  // Plataformas: lista de TMDB + las que ya tienes guardadas (si falta phase9.sql no se muestra)
  const { lang } = await getT();
  const [allProviders, { data: provRow, error: provErr }] = await Promise.all([
    getProviders(lang).catch(() => []),
    supabase.from("profiles").select("providers").eq("id", user.id).maybeSingle(),
  ]);

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
    <PushToggle />
    {!provErr && allProviders.length > 0 && (
      <ProvidersPicker providers={allProviders} initial={((provRow?.providers as number[] | null) ?? [])} />
    )}
    <BlockedList people={(blockedPeople ?? []) as any} />
    </>
  );
}
