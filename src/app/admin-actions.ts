"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("is_admin");
  return data === true ? { supabase, user } : null;
}

// Resuelve las denuncias de un mensaje:
//  dismiss = no pasa nada · delete = borra el mensaje · delete_block = borra y silencia al autor
export async function adminResolve(
  commentId: string,
  action: "dismiss" | "delete" | "delete_block"
): Promise<{ ok: boolean }> {
  const ctx = await requireAdmin();
  if (!ctx || !isUuid(commentId)) return { ok: false };
  const { supabase } = ctx;

  if (action === "dismiss") {
    const { error } = await supabase
      .from("comment_reports")
      .update({ status: "dismissed" })
      .eq("comment_id", commentId)
      .eq("status", "open");
    if (error) return { ok: false };
  } else {
    let authorId: string | null = null;
    if (action === "delete_block") {
      const { data } = await supabase.from("comments").select("user_id").eq("id", commentId).maybeSingle();
      authorId = (data?.user_id as string | undefined) ?? null;
    }
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) return { ok: false };
    if (authorId) {
      await supabase
        .from("comment_blocks")
        .upsert({ user_id: authorId, reason: "Moderación" }, { onConflict: "user_id" });
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminUnblock(userId: string): Promise<{ ok: boolean }> {
  const ctx = await requireAdmin();
  if (!ctx || !isUuid(userId)) return { ok: false };
  const { error } = await ctx.supabase.from("comment_blocks").delete().eq("user_id", userId);
  if (error) return { ok: false };
  revalidatePath("/admin");
  return { ok: true };
}
