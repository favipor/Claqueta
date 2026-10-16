"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export async function blockUser(targetId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(targetId) || targetId === user.id) return { ok: false };
  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unblockUser(targetId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(targetId)) return { ok: false };
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
    // las solicitudes siguen pendientes hasta contestarlas y los mensajes hasta abrir el chat
    .not("type", "in", "(follow_request,message,recommendation)");
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearReadNotifications(): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .not("read_at", "is", null);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}
