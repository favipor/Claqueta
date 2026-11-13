"use server";

import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS, unlockedCodes, type AchStats } from "@/lib/achievements";

export type NewAchievement = { code: string; emoji: string; name: [string, string]; tier: number };

// Comprueba si has conseguido logros nuevos. La primera vez se guardan todos sin avisar uno a uno
// (devuelve cuántos tenías ya) para no llenar la pantalla de avisos.
export async function syncAchievements(): Promise<{ fresh: NewAchievement[]; firstTime: number; username: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fresh: [], firstTime: 0, username: null };
  const [{ data: stats }, { data: have }, { data: prof }] = await Promise.all([
    supabase.rpc("achievement_stats", { p_user: user.id }),
    supabase.from("user_achievements").select("code").eq("user_id", user.id),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  if (!stats) return { fresh: [], firstTime: 0, username: null };
  const owned = new Set((have ?? []).map((r) => r.code as string));
  const codes = unlockedCodes(stats as AchStats).filter((c) => !owned.has(c));
  if (!codes.length) return { fresh: [], firstTime: 0, username: prof?.username ?? null };
  const first = owned.size === 0;
  await supabase.from("user_achievements").insert(codes.map((code) => ({ user_id: user.id, code, seen: true })));
  if (first) return { fresh: [], firstTime: codes.length, username: prof?.username ?? null };
  const fresh = codes.map((code) => {
    const [id, t] = code.split(":");
    const a = ACHIEVEMENTS.find((x) => x.id === id)!;
    return { code, emoji: a.emoji, name: a.name, tier: Number(t) };
  });
  // Si subes varios niveles de golpe, solo se avisa del más alto de cada insignia
  const best = new Map<string, NewAchievement>();
  for (const f of fresh) {
    const id = f.code.split(":")[0];
    if ((best.get(id)?.tier ?? 0) < f.tier) best.set(id, f);
  }
  return { fresh: [...best.values()].slice(0, 3), firstTime: 0, username: prof?.username ?? null };
}
