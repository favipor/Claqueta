"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateEntry } from "@/app/actions";

export type DmError =
  | "auth" | "self" | "no_username" | "blocked" | "empty" | "too_long"
  | "rate_limit" | "not_mutual" | "declined" | "request_limit" | "db";

const KNOWN: DmError[] = [
  "auth", "self", "no_username", "blocked", "empty", "too_long",
  "rate_limit", "not_mutual", "declined", "request_limit",
];

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

function mapError(message: string | undefined): DmError {
  return KNOWN.find((k) => message?.includes(k)) ?? "db";
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function sendMessage(toId: string, body: string): Promise<{ ok: true } | { ok: false; error: DmError }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(toId)) return { ok: false, error: "auth" };
  const { error } = await supabase.rpc("dm_send", {
    p_to: toId,
    p_kind: "text",
    p_body: String(body ?? "").slice(0, 1200),
  });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath("/mensajes");
  return { ok: true };
}

export async function sendRecommendation(
  toId: string,
  meta: { tmdb_id: number; media_type: string; title: string; poster_path: string | null },
  note: string
): Promise<{ ok: true } | { ok: false; error: DmError }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(toId)) return { ok: false, error: "auth" };
  if (!Number.isInteger(meta.tmdb_id) || (meta.media_type !== "movie" && meta.media_type !== "tv")) {
    return { ok: false, error: "empty" };
  }
  const { error } = await supabase.rpc("dm_send", {
    p_to: toId,
    p_kind: "recommendation",
    p_body: String(note ?? "").slice(0, 400),
    p_tmdb: meta.tmdb_id,
    p_type: meta.media_type,
    p_title: String(meta.title).slice(0, 300),
    p_poster: meta.poster_path,
  });
  if (error) return { ok: false, error: mapError(error.message) };
  return { ok: true };
}

export async function respondRequest(otherId: string, accept: boolean): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(otherId)) return { ok: false };
  const { error } = await supabase.rpc("dm_respond", { p_other: otherId, p_accept: accept });
  if (error) return { ok: false };
  revalidatePath("/mensajes", "layout");
  return { ok: true };
}

// Al abrir una conversación: se guarda hasta dónde has leído (solo tú lo ves) y se limpian sus avisos
export async function markConversationRead(otherId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user || !isUuid(otherId)) return { ok: false };
  const now = new Date().toISOString();
  await supabase
    .from("dm_reads")
    .upsert({ user_id: user.id, other_id: otherId, last_read_at: now }, { onConflict: "user_id,other_id" });
  await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .eq("actor_id", otherId)
    .in("type", ["message", "recommendation"])
    .is("read_at", null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function listMutualFollowers(): Promise<
  { id: string; username: string; display_name: string | null; avatar_url: string | null }[]
> {
  const { supabase, user } = await getUser();
  if (!user) return [];
  const { data } = await supabase.rpc("mutual_followers");
  return (data ?? []) as never;
}

// «Añadir a pendientes» desde una recomendación: no pisa el estado que ya tengas
export async function addToPending(meta: {
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
}): Promise<{ ok: boolean; already?: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false };
  if (!Number.isInteger(meta.tmdb_id) || (meta.media_type !== "movie" && meta.media_type !== "tv")) {
    return { ok: false };
  }
  const { data: cur } = await supabase
    .from("user_titles")
    .select("status")
    .eq("user_id", user.id)
    .eq("tmdb_id", meta.tmdb_id)
    .eq("media_type", meta.media_type)
    .maybeSingle();
  if (cur?.status) return { ok: true, already: true };
  return updateEntry({
    tmdb_id: meta.tmdb_id,
    media_type: meta.media_type,
    title: meta.title,
    poster_path: meta.poster_path,
    patch: { status: "pendiente" },
  });
}
