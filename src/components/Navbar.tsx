import { createClient } from "@/lib/supabase/server";
import { NavbarClient, type Account } from "./NavbarClient";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account: Account | null = null;
  if (user) {
    const [{ data }, { count }, { count: unread }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    // Administrador: enlace al panel con el número de denuncias abiertas
    let isAdmin = false;
    let openReports = 0;
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin === true) {
      isAdmin = true;
      const { count: c } = await supabase
        .from("comment_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      openReports = c ?? 0;
    }

    account = {
      name: data?.display_name ?? user.email ?? "?",
      username: data?.username ?? null,
      avatarUrl: data?.avatar_url ?? null,
      userId: user.id,
      pendingRequests: count ?? 0,
      unread: unread ?? 0,
      isAdmin,
      openReports,
    };
  }

  return <NavbarClient account={account} />;
}
