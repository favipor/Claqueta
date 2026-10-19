import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsers, type AdminStats, type AdminUserRow } from "@/components/AdminUsers";
import { AdminPanel, type BlockedItem, type ReportItem } from "@/components/AdminPanel";

export const metadata = { title: "Admin · Claqueta" };

const PAGE_SIZE = 20;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  const { data: reps } = await supabase
    .from("comment_reports")
    .select("comment_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const commentIds = [...new Set((reps ?? []).map((r) => r.comment_id as string))];
  const { data: comments } =
    commentIds.length > 0
      ? await supabase
          .from("comments")
          .select("id, user_id, body, visibility, tmdb_id, media_type")
          .in("id", commentIds)
      : { data: [] };

  const { data: blocks } = await supabase
    .from("comment_blocks")
    .select("user_id")
    .order("created_at", { ascending: false });

  const userIds = [
    ...new Set([
      ...(comments ?? []).map((c) => c.user_id as string),
      ...(blocks ?? []).map((b) => b.user_id as string),
    ]),
  ];
  const { data: people } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, username, display_name").in("id", userIds)
      : { data: [] };
  const person = new Map((people ?? []).map((p) => [p.id as string, p]));

  const reports: ReportItem[] = commentIds
    .map((id) => {
      const c = (comments ?? []).find((x) => x.id === id);
      if (!c) return null;
      const mine = (reps ?? []).filter((r) => r.comment_id === id);
      const a = person.get(c.user_id as string);
      return {
        comment_id: id,
        body: c.body as string,
        visibility: c.visibility as string,
        tmdb_id: c.tmdb_id as number,
        media_type: c.media_type as string,
        author: a
          ? {
              id: a.id as string,
              username: (a.username as string | null) ?? null,
              display_name: (a.display_name as string | null) ?? null,
            }
          : null,
        reasons: mine.map((r) => r.reason as string | null).filter((x): x is string => !!x),
        count: mine.length,
      };
    })
    .filter((x): x is ReportItem => x !== null);

  const blocked: BlockedItem[] = (blocks ?? []).map((b) => {
    const p = person.get(b.user_id as string);
    return {
      user_id: b.user_id as string,
      username: (p?.username as string | null) ?? null,
      display_name: (p?.display_name as string | null) ?? null,
    };
  });

  // Usuarios registrados (solo disponible si se ha ejecutado phase7.sql)
  const [{ data: statsData }, { data: usersData }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_users", { p_q: q, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
  ]);
  const userRows = (usersData ?? []) as (AdminUserRow & { total: number })[];
  const total = Number(userRows[0]?.total ?? 0);

  return (
    <div className="space-y-10">
      {statsData || userRows.length > 0 ? (
        <AdminUsers
          stats={(statsData ?? null) as AdminStats | null}
          users={userRows.map((u) => ({ ...u, titles: Number(u.titles), comments: Number(u.comments) }))}
          total={total}
          me={user.id}
          q={q}
          page={page}
          pageSize={PAGE_SIZE}
        />
      ) : null}
      <AdminPanel reports={reports} blocked={blocked} />
    </div>
  );
}
