"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGES } from "@/lib/challenges";

type Meta = { tmdb_id: number; media_type: "movie" | "tv"; title: string; poster_path: string | null };

// Proponer a un amigo (mutuo) ver un título un día concreto
export async function proposePlan(friendId: string, meta: Meta, date: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (meta.media_type !== "movie" && meta.media_type !== "tv")) return { ok: false };
  const { error } = await supabase.from("watch_plans").insert({
    creator_id: user.id,
    invitee_id: friendId,
    tmdb_id: meta.tmdb_id,
    media_type: meta.media_type,
    title: String(meta.title).slice(0, 300),
    poster_path: meta.poster_path,
    plan_date: date,
  });
  revalidatePath("/juntos");
  return { ok: !error };
}

export async function setPlanStatus(id: string, status: "accepted" | "declined" | "cancelled"): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("watch_plans").update({ status }).eq("id", id);
  revalidatePath("/juntos");
  revalidatePath("/calendario");
  return { ok: !error };
}

export async function toggleChallenge(code: string, join: boolean): Promise<{ ok: boolean }> {
  if (!CHALLENGES.some((c) => c.code === code)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = join
    ? await supabase.from("challenge_members").upsert({ code, user_id: user.id })
    : await supabase.from("challenge_members").delete().eq("code", code).eq("user_id", user.id);
  revalidatePath("/retos");
  return { ok: !error };
}
