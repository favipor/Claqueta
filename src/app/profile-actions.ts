"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usernameProblem } from "@/lib/profile";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

// ------------------------------------------------------------ usuario (@)

export async function checkUsername(
  raw: string
): Promise<"ok" | "invalid" | "reserved" | "taken"> {
  const u = String(raw ?? "").trim().toLowerCase();
  const problem = usernameProblem(u);
  if (problem) return problem;

  const { supabase, user } = await getUser();
  if (!user) return "invalid";
  const { data, error } = await supabase.rpc("username_available", { p_username: u });
  if (error) return "invalid";
  return data ? "ok" : "taken";
}

type OnboardingResult = {
  ok: boolean;
  username?: string;
  error?: "invalid" | "reserved" | "taken" | "auth" | "db";
};

export async function completeOnboarding(input: {
  username: string;
  displayName: string;
  isPrivate: boolean;
}): Promise<OnboardingResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "auth" };

  const username = String(input.username ?? "").trim().toLowerCase();
  const problem = usernameProblem(username);
  if (problem) return { ok: false, error: problem };

  const displayName = String(input.displayName ?? "").trim().slice(0, 50);

  const patch: Record<string, unknown> = {
    username,
    is_private: !!input.isPrivate,
  };
  if (displayName) patch.display_name = displayName;

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .is("username", null) // solo se puede elegir una vez
    .select("username")
    .maybeSingle();

  if (error) return { ok: false, error: error.code === "23505" ? "taken" : "db" };
  if (!data) return { ok: false, error: "db" };

  revalidatePath("/", "layout");
  return { ok: true, username: data.username as string };
}

// ------------------------------------------------------------ perfil

export async function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null; // undefined = no tocar; null = quitar la foto
}): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };

  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    const name = input.displayName.trim().slice(0, 50);
    if (name) patch.display_name = name;
  }
  if (input.bio !== undefined) {
    const bio = input.bio.trim().slice(0, 160);
    patch.bio = bio === "" ? null : bio;
  }
  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl !== null) {
      // Solo se aceptan fotos del propio bucket de Supabase, dentro de la carpeta del usuario
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const prefix = `${base}/storage/v1/object/public/avatars/${user.id}/`;
      if (!base || !input.avatarUrl.startsWith(prefix)) return { ok: false };
    }
    patch.avatar_url = input.avatarUrl;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPrivacy(
  isPrivate: boolean
): Promise<{ ok: boolean; error?: "cooldown" | "db" }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "db" };

  const { error } = await supabase
    .from("profiles")
    .update({ is_private: !!isPrivate })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message.includes("privacy_cooldown") ? "cooldown" : "db" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ------------------------------------------------------------ seguir

export async function followUser(
  targetId: string
): Promise<{ ok: boolean; status?: "pending" | "accepted" }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(targetId) || targetId === user.id) return { ok: false };

  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId })
    .select("status")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", targetId)
        .maybeSingle();
      if (existing) return { ok: true, status: existing.status as "pending" | "accepted" };
    }
    return { ok: false };
  }
  return { ok: true, status: data.status as "pending" | "accepted" };
}

// Dejar de seguir o cancelar una solicitud pendiente
export async function unfollowUser(targetId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(targetId)) return { ok: false };
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  return { ok: !error };
}

export async function respondFollowRequest(
  followerId: string,
  accept: boolean
): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(followerId)) return { ok: false };

  const q = accept
    ? supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("follower_id", followerId)
        .eq("following_id", user.id)
        .eq("status", "pending")
    : supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", user.id)
        .eq("status", "pending");

  const { error } = await q;
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeFollower(followerId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(followerId)) return { ok: false };
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id);
  return { ok: !error };
}
