import { createClient } from "@/lib/supabase/server";
import { NavbarClient, type Account } from "./NavbarClient";

type Summary = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  pending: number;
  unread: number;
  is_admin: boolean;
  open_reports: number;
};

export async function Navbar() {
  const supabase = await createClient();

  // Una sola consulta con todo lo que necesita la barra (phase9.sql).
  // Si devuelve null es que no hay sesión.
  const { data, error } = await supabase.rpc("navbar_summary");
  if (!error) {
    const s = data as Summary | null;
    const account: Account | null = s
      ? {
          name: s.display_name ?? s.email ?? "?",
          username: s.username,
          avatarUrl: s.avatar_url,
          userId: s.id,
          pendingRequests: Number(s.pending) || 0,
          unread: Number(s.unread) || 0,
          isAdmin: !!s.is_admin,
          openReports: Number(s.open_reports) || 0,
        }
      : null;
    return <NavbarClient account={account} />;
  }

  // Sin phase9.sql: consultas por separado (como antes)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account: Account | null = null;
  if (user) {
    const [{ data: profile }, { count }, { count: unread }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).maybeSingle(),
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
      supabase.rpc("is_admin"),
    ]);
    let openReports = 0;
    if (admin === true) {
      const { count: c } = await supabase
        .from("comment_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      openReports = c ?? 0;
    }
    account = {
      name: profile?.display_name ?? user.email ?? "?",
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      userId: user.id,
      pendingRequests: count ?? 0,
      unread: unread ?? 0,
      isAdmin: admin === true,
      openReports,
    };
  }

  return <NavbarClient account={account} />;
}
